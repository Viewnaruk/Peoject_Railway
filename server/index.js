const express = require('express')
const mongoose = require('mongoose')
const axios = require("axios"); 
const path = require('path');
const cors = require('cors');
const app = express()
const { MongoClient } = require('mongodb');


require('dotenv').config();
app.use(cors());
app.use(express.json());

// 




const mongoURI = process.env.MONGO_URI || 'mongodb+srv://sasipreyas:1234@cluster0.fwzmzgy.mongodb.net/Web_App_Tourist_Reviews?retryWrites=true&w=majority';
if (!mongoURI) {
  console.error('❌ ERROR: MONGO_URI environment variable is not set!');
  process.exit(1);
}
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });


const ReviewSchema = mongoose.Schema({
     Tourist_Attraction_ThaiName : String ,
     Tourist_Attraction_Category : String ,
     Tourist_Attraction : String ,
     Name : mongoose.Schema.Types.Mixed,
     Review : String ,
     Rating : String ,
     label : String ,
     Emoji : String ,
     Emoji_Label : Number ,
     Label_vaderSentiment : String ,
     Adjective : String ,
     Aspect : String ,
     CreateAt : { type: Date, default: Date.now }
})

const ReviewModel = mongoose.model("Review", ReviewSchema,"Review")

// Health Check
app.get('/health', (req, res) => {
  console.log('Health check received');
  res.status(200).send('OK');
});


app.get("/getReviews", (req, res) => {
    const place = req.query.place;
    const filter = place ? { Tourist_Attraction: place } : {};
    ReviewModel.find(filter).then(function(review) {
        res.json(review)
    }).catch(function(err){
        console.log(err)
    })
})




app.get('/top10', async (req, res) => {
  const labelType = req.query.label;

  try {
    const results = await ReviewModel.aggregate([
      // Group reviews by tourist attraction and label
      {
        $group: {
          _id: { attraction: "$Tourist_Attraction", label: "$label" },
          count: { $sum: 1 }
        }
      },
      // Restructure to group by attraction with counts of each label
      {
        $group: {
          _id: "$_id.attraction",
          counts: {
            $push: {
              label: "$_id.label",
              count: "$count"
            }
          }
        }
      },
      // Create separate fields for positive and negative counts
      {
        $project: {
          _id: 1,
          positiveCount: {
            $let: {
              vars: {
                match: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$counts",
                        as: "item",
                        cond: { $eq: ["$$item.label", "Positive"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: { $ifNull: ["$$match.count", 0] }
            }
          },
          negativeCount: {
            $let: {
              vars: {
                match: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$counts",
                        as: "item",
                        cond: { $eq: ["$$item.label", "Negative"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: { $ifNull: ["$$match.count", 0] }
            }
          }
        }
      },
      // Sort by selected label count
      {
        $sort: {
          ...(labelType === 'Positive'
            ? { positiveCount: -1 }
            : { negativeCount: -1 })
        }
      },
      { $limit: 10 }
    ]);

    res.json(results);
  } catch (err) {
    console.error("Error fetching top10:", err);
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await ReviewModel.find({});
    res.json(reviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: err.message });
  }
});



app.get("/getAspects", async (req, res) => {
  const category = req.query.category;

  // ดึง Aspect ที่ unique จาก MongoDB
  const aspects = await ReviewModel.distinct("Aspect", {Tourist_Attraction_Category:category});
  res.json(aspects);
});


app.get("/getAspectStats", async (req, res) => {
  const { category, aspect } = req.query;

  // นับจำนวน Positive/Negative/Neutral
  const pipeline = [
    { $match: {Tourist_Attraction_Category: category, Aspect: aspect } },
    { $group: { _id: "$label", count: { $sum: 1 } } }
  ];
  const result = await ReviewModel.aggregate(pipeline);

  const labels = ["Positive","Negative"];
  const values = labels.map(l => {
    const found = result.find(r => r._id === l);
    return found ? found.count : 0;
  });

  res.json({ labels, values });
});


app.get("/getAspectStatsByPlace", async (req, res) => {
  const { category, aspect } = req.query;

  try {
    const pipeline = [
      { $match: { Tourist_Attraction_Category: category, Aspect: aspect } },
      { 
        $group: {
          _id: { place: "$Tourist_Attraction", label: "$label" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.place",
          counts: {
            $push: { label: "$_id.label", count: "$count" }
          }
        }
      },
      {
        $project: {
          place: "$_id",
          positive: {
            $let: {
              vars: { match: { $arrayElemAt: [ { $filter: { input: "$counts", as: "c", cond: { $eq: ["$$c.label","Positive"] } } }, 0 ] } },
              in: { $ifNull: ["$$match.count", 0] }
            }
          },
          negative: {
            $let: {
              vars: { match: { $arrayElemAt: [ { $filter: { input: "$counts", as: "c", cond: { $eq: ["$$c.label","Negative"] } } }, 0 ] } },
              in: { $ifNull: ["$$match.count", 0] }
            }
          }
        }
      },
      { $sort: { place: 1 } } // เรียงตามชื่อสถานที่
    ];

    const results = await ReviewModel.aggregate(pipeline);
    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


const Review = mongoose.model("Review", ReviewSchema);

app.get("/analyze", async (req, res) => {
  try {
    // ดึงรีวิวทั้งหมดจาก MongoDB
    const reviews = await Review.find({}).limit(10);  // จำกัดแค่ 10 รีวิวสำหรับทดสอบ
    console.log("Number of reviews fetched:", reviews.length);
    const results = [];

    // loop ส่ง _id ไป FastAPI วิเคราะห์
    for (const r of reviews) {
      try {
        const response = await axios.post(`${FASTAPI_URL}`, {
          review_id: r._id
        });
        results.push(response.data);
      } catch (err) {
        console.error("Error analyzing review:", r._id, err.message);
      }
    }

    res.json(results); // ส่งผลลัพธ์ทั้งหมด
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/getStatsByCategory", async (req, res) => {
  const category = req.query.category;
  const result = await ReviewModel.aggregate([
    { $match: { Tourist_Attraction_Category: category } },
    { $group: {
        _id: "$Tourist_Attraction",
        positive: { $sum: { $cond: [{ $eq: ["$label", "Positive"] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ["$label", "Negative"] }, 1, 0] } }
      }
    }
  ]);

  res.json(result.map(r => ({ place: r._id, positive: r.positive, negative: r.negative })));
});

app.get("/getStatsByPlace", async (req, res) => {
  const place = req.query.place;
  const result = await ReviewModel.aggregate([
    { $match: { Tourist_Attraction: place } },
    { $group: {
        _id: "$Aspect",
        positive: { $sum: { $cond: [{ $eq: ["$label", "Positive"] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ["$label", "Negative"] }, 1, 0] } }
      }
    }
  ]);

  res.json(result.map(r => ({ aspect: r._id, positive: r.positive, negative: r.negative })));
});


// app.use(express.static(path.join(__dirname, '..', 'public')));


// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname,'..', 'public', 'index.html'));

// });

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error serving index.html');
    }
  });
});

// Favicon
app.get('/favicon.ico', (req, res) => {
  console.log('Received /favicon.ico request');
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  res.sendFile(faviconPath, (err) => {
    if (err) {
      console.error('Error serving favicon.ico:', err);
      res.status(204).end();
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});


// app.listen(3001, () =>  {
//     console.log("Server is Running at http://localhost:3001")
// })

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Bind to all interfaces
app.listen(PORT, HOST, () => console.log(`✅ Server running on port ${PORT}`));


//ถ้าจะแก้ให้เหมือนเดิมแก้ตรงนี้
const FASTAPI_URL = 'https://your-fastapi-service.onrender.com';
app.get("/analyze", async (req, res) => {
  try {
    const reviews = await ReviewModel.find({}).limit(10);
    console.log("Number of reviews fetched:", reviews.length);
    const results = [];

    for (const r of reviews) {
      try {
        const response = await axios.post(`${FASTAPI_URL}/predict`, {
          review_id: r._id
        });
        results.push(response.data);
      } catch (err) {
        console.error("Error analyzing review:", r._id, err.message);
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/addReview', async (req, res) => {
  console.log("Received request to /addReview at", new Date().toISOString(), req.body);

  try {
    // รับค่าจาก client และตรวจสอบ
    const {
      Tourist_Attraction_ThaiName,
      Tourist_Attraction_Category,
      Tourist_Attraction,
      Review
    } = req.body;

    if (!Review) throw new Error('Review is required');
    if (!Tourist_Attraction_Category) throw new Error('Tourist_Attraction_Category is required');

    // เตรียมข้อมูลเบื้องต้น
    const newReview = {
      Tourist_Attraction_ThaiName: Tourist_Attraction_ThaiName || "-",
      Tourist_Attraction_Category: Tourist_Attraction_Category || "-",
      Tourist_Attraction: Tourist_Attraction || "-",
      Name: "-",
      Review: Review || "-",
      Rating: "-",
      label: "-",
      Emoji: "-",
      Emoji_Label: "-",
      Label_vaderSentiment: "-",
      Aspect: "-",
      CreateAt: new Date() // ตั้งค่าเพียงครั้งเดียว
    };

    // ส่งรีวิวไป FastAPI เพื่อวิเคราะห์
    console.log('Calling FastAPI at:', FASTAPI_URL);
    const predictStart = Date.now();
    const predictRes = await axios.post(`${FASTAPI_URL}/predict`, {
      review: Review,
      category: Tourist_Attraction_Category // เพิ่ม category ตาม FastAPI
    }, { timeout: 20000 }); // เพิ่ม timeout เพื่อป้องกัน hang
    console.log(`FastAPI call took ${Date.now() - predictStart}ms`, predictRes.data);

    // ตรวจสอบและดึงข้อมูลจาก FastAPI
    const { sentiment, emojis, emoji_label, Aspect, score } = predictRes.data || {};
    if (!sentiment || emojis === undefined || emoji_label === undefined || !Aspect || score === undefined) {
      throw new Error('Incomplete or invalid response from FastAPI: ' + JSON.stringify(predictRes.data));
    }

    // อัปเดตข้อมูลที่ได้จากโมเดล
    newReview.label = sentiment || "-";
    newReview.Emoji = Array.isArray(emojis) ? emojis.join(' ') : (emojis || "-");
    newReview.Emoji_Label = typeof emoji_label === "number" ? emoji_label : 0;
    newReview.Aspect = Aspect || "-";

    // บันทึกลง MongoDB
    const saved = await ReviewModel.create(newReview);
    console.log('Review saved successfully:', saved);

    res.json({
      success: true,
      review: saved,
      sentiment: sentiment,
      aspect_stripped: Aspect,
      CreateAt: saved.CreateAt
    });
  } catch (err) {
    console.error("Error adding review:", {
      message: err.message,
      stack: err.stack,
      status: err.response?.status,
      data: err.response?.data,
      requestBody: req.body
    });
    res.status(500).json({ error: err.message });
  }
});