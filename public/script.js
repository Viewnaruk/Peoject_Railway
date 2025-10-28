

async function updatePlacesList(selectedCategory = 'All') {
  // ดึงข้อมูลทั้งหมด
  const data = await fetchDataByPlace('');

  const uniqueNames = new Set();

  data.forEach(item => {
    // ถ้าเลือก All หรือ category ตรงกับ item
    if (selectedCategory === 'All' || item.Tourist_Attraction_Category === selectedCategory) {
      if (item.Tourist_Attraction) uniqueNames.add(item.Tourist_Attraction);
  }; 
  }); 


  // เติม datalist
  const datalist = document.getElementById('places-list');
  datalist.innerHTML = '';
  Array.from(uniqueNames).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
}






async function updateOverviewTitle() {
  const place = document.getElementById('places').value.trim();
  const category = document.getElementById('category').value;
  const title = document.getElementById('overviewTitle');

  const data = await fetchDataByPlace(''); 

  const allPlaces = data.map(item => 
    (item.Tourist_Attraction || "").toLowerCase());

  // 1) ถ้ามี place (ไม่ว่างและไม่ใช่ "All") -> แสดง place
  if (place && place !== "All") {
    const lowerPlace = place.toLowerCase();

    // ตรวจสอบว่ามีในฐานข้อมูลไหม
    const exists = allPlaces.includes(lowerPlace);

    if (!exists) {
      title.textContent = `This tourist attraction was not found.`;
      title.style.color = "red";
      title.style.fontFamily = "Imprima, sans-serif";
      return;
    }

    // ถ้ามีสถานที่ในฐานข้อมูล → แสดงข้อความปกติ
    title.textContent = `Overview of Sentiment Analysis Results for Tourist Attractions in ${place}`;
    title.style.color = "";
    return;
  }
  // 2) ถ้าเลือก category ที่ไม่ใช่ All -> แสดง category
  if (category && category !== "All") {
    title.textContent = `Overview of Sentiment Analysis Results for Tourist Attractions in ${category}`;
    return;
  }
  // 3) ค่าเริ่มต้น (ไม่มี place และ category = All)
  title.textContent = "Overview of Sentiment Analysis Results for Tourist Attractions in Khon Kaen";
}

  
// ฟังก์ชันดึงข้อมูลตามสถานที่ที่เลือก
async function fetchDataByPlace(place) {
  try {
    const baseUrl = window.location.origin || 'http://localhost:8080';
    const url = place
      ? `${baseUrl}/getReviews?place=${encodeURIComponent(place)}`
      : `${baseUrl}/getReviews`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched data:', data); // Log เพื่อ debug
    return data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return [];
  }
}

// ฟังก์ชันอัปเดตข้อมูลทั้งหมด
async function updateAllData(place = '') {
  const data = await fetchDataByPlace(place);
  
  // อัปเดตตัวเลขสรุป
  updateReviewSummary(data);
  
  // อัปเดตแผนภูมิ
  updateChart(data);
}

async function filterAndShowSummary() {
  const category = document.getElementById('category').value;
  let place = document.getElementById('places').value.trim();

  if (place === "") place = "All"; // ถ้าว่างถือว่า All

  const data = await fetchDataByPlace('');

  // กรอง category
  let filtered = data;
  if (category !== "All") {
    filtered = filtered.filter(item => item.Tourist_Attraction_Category === category);
  }

  // กรอง place
  if (place !== "All") {
    filtered = filtered.filter(item =>
      (item.Tourist_Attraction_ThaiName && item.Tourist_Attraction_ThaiName.toLowerCase().includes(place.toLowerCase())) ||
      (item.Tourist_Attraction && item.Tourist_Attraction.toLowerCase().includes(place.toLowerCase()))
    );
  }

  // แสดงผล
  document.querySelector('.review-summary').style.display = "flex";
  document.getElementById('chart').style.display = "block";

  updateReviewSummary(filtered);
  updateChart(filtered);
}




// ฟังก์ชันอัปเดตสรุปผลรีวิว
function updateReviewSummary(data) {
  const positiveCount = data.filter(item => item.label === 'Positive').length;
  const negativeCount = data.filter(item => item.label === 'Negative').length;
  const total = positiveCount + negativeCount;

document.getElementById('all-reviews').textContent = total.toLocaleString();
document.getElementById('positive-reviews').textContent = positiveCount.toLocaleString();
document.getElementById('negative-reviews').textContent = negativeCount.toLocaleString();
}

// ฟังก์ชันอัปเดตแผนภูมิ
// ...existing code...
function updateChart(data) {
  const positiveCount = data.filter(item => item.label === 'Positive').length;
  const negativeCount = data.filter(item => item.label === 'Negative').length;

  // เช็คว่า sentimentChart ถูกสร้างและมี datasets จริง
  if (
    window.sentimentChart &&
    window.sentimentChart.data &&
    Array.isArray(window.sentimentChart.data.datasets) &&
    window.sentimentChart.data.datasets[0]
  ) {
    window.sentimentChart.data.datasets[0].data = [positiveCount, negativeCount];
    window.sentimentChart.update();
  } else {
    createChart(positiveCount, negativeCount);
  }
}
// ...existing code...





// สร้างแผนภูมิใหม่
function createChart(positiveCount, negativeCount) {
  const ctx = document.getElementById('sentimentChart').getContext('2d');
  window.sentimentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Positive', 'Negative'],
      datasets: [{
        label: 'Sentiment Count',
        data: [positiveCount, negativeCount],
        backgroundColor: ['#77F9B1', '#FF7B7B'],
        borderColor: ['#77F9B1', '#FF7B7B'],
        borderWidth: 1,
        barThickness: 100
      }]
    },
    options: {
      responsive: false, // <<<<<< ปิด responsive
      plugins: {
        title: {
          display: true,
          text: 'Graph Showing Overall Sentiment Analysis Results',
          font: { size: 18, family: 'Imprima, sans-serif' },
          padding: { top: 10, bottom: 30 }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Number of Reviews' }
        }
      }
    }
  });
}

// เรียกใช้ครั้งแรกเมื่อโหลดหน้า


async function onPlaceChange() {
  updateOverviewTitle();
  
  const top10Section = document.getElementById("top10Section");
  const reviewSection = document.getElementById("reviewSection");
  const reviewTbody = document.querySelector("#reviewTable tbody");

  reviewTbody.innerHTML = "";

  if (category === "All") {
    top10Section.style.display = "block";
    reviewSection.style.display = "none";

    updateAllData();
    fetchTop10();

  } else {
    top10Section.style.display = "none";
    reviewSection.style.display = "block";

        // ...โค้ดการดึงข้อมูลและอัปเดต dropdown
        const response = await fetch(`/getAspects?category=${encodeURIComponent(category)}`);
        const data = await response.json();
        const sentiment = document.getElementById('Result').value;

        // 🔹 เรียกใช้ renderReviews โดยส่งข้อมูลทั้งหมด, sentiment และ keyword ไป
        renderReviews(data, sentiment, "all");
  }
}

// ฟังก์ชันสุ่ม array
function shuffleArray(array) {
    let arr = array.slice(); // copy
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ฟังก์ชัน render reviews ครบ
function renderReviews(data, sentiment = "all", selectedCategory = "All", place = "") {
    const reviewTbody = document.querySelector("#reviewTable tbody");
    const reviewSection = document.getElementById("reviewSection");
    const top10Section = document.getElementById("top10Section");

    // ถ้าเลือก All ทั้ง category และ place → แสดง Top10 แทน
    if (selectedCategory === "All" && (!place || place === "")) {
    // แสดง Top10 เฉพาะตอน category เป็น All และ place ว่างจริง ๆ
    top10Section.style.display = "block";
    reviewSection.style.display = "none";
    fetchTop10();
    return;
    } else {
    // ถ้ามี place หรือ category ไม่ใช่ All → แสดงรีวิว
    top10Section.style.display = "none";
    reviewSection.style.display = "block";
    }
    reviewTbody.innerHTML = ""; // ล้างรีวิว

    let filtered = data;

    // กรองตาม category ถ้ามี
    if (selectedCategory !== "All") {
        filtered = filtered.filter(r => r.Tourist_Attraction_Category === selectedCategory);
    }

    // กรองตาม place ถ้ามี
    if (place && place !== "All") {
        filtered = filtered.filter(r =>
            (r.Tourist_Attraction_ThaiName && r.Tourist_Attraction_ThaiName.toLowerCase().includes(place.toLowerCase())) ||
            (r.Tourist_Attraction && r.Tourist_Attraction.toLowerCase().includes(place.toLowerCase()))
        );
    }

    // กรองตาม sentiment
    filtered = filtered.filter(r => r.label === sentiment);
    
    filtered.sort((a, b) => {
        // แปลงค่า CreateAt เป็น Timestamp เพื่อเปรียบเทียบ
        const dateA = new Date(a.CreateAt).getTime();
        const dateB = new Date(b.CreateAt).getTime();

        // เรียงจากใหม่ไปเก่า (Descending): b - a
        // ถ้า b ใหม่กว่า a, ผลลัพธ์จะเป็นบวก ทำให้ b อยู่ก่อน a
        return dateB - dateA;
    });

    // ถ้าเลือก category แต่ place ว่าง → สุ่มรีวิว 200 รีวิว (ถ้ามากกว่า)
    const maxRows = 200;
    if (!place || place === "") {
        filtered = shuffleArray(filtered).slice(0, maxRows);
    } else {
        filtered = filtered.slice(0, maxRows);
    }

    const maxLength = 100;
    let rows = [];

    filtered.forEach((review, index) => {
        let fullText = review.Review || "-";
        let shortText = fullText.length > maxLength ? fullText.slice(0, maxLength) + "..." : fullText;
        let resultIcon =
            review.label === "Positive"
                ? '<img src="/img/positive.png" alt="Positive" style="width:24px;height:24px;">'
                : '<img src="/img/negative.png" alt="Negative" style="width:24px;height:24px;">';

        rows.push(`
            <tr>
                <td>${index + 1}</td>
                <td>${review.Tourist_Attraction || "-"}</td>
                <td class="review-scroll">
                    <span class="short-text">${shortText}</span>
                    <span class="full-text" style="display:none;">${fullText}</span>
                    ${fullText.length > maxLength ? '<button class="show-more-btn">More</button>' : ''}
                </td>
                <td class="result-icon">${resultIcon}</td>
            </tr>
        `);
    });

    reviewTbody.innerHTML = rows.join("");
}

// ฟังก์ชันเรียก filter & render
async function filterAndRender() {
    const category = document.getElementById('category').value;
    const place = document.getElementById('places').value.trim();
    const sentiment = document.getElementById('Result').value;
    

    const data = await fetchDataByPlace('');

    // อัปเดต Review Summary
    const summaryData = data.filter(r => {
        let matchCategory = category === "All" || r.Tourist_Attraction_Category === category;
        let matchPlace = !place || place === "" || 
            (r.Tourist_Attraction_ThaiName && r.Tourist_Attraction_ThaiName.toLowerCase().includes(place.toLowerCase())) ||
            (r.Tourist_Attraction && r.Tourist_Attraction.toLowerCase().includes(place.toLowerCase()));
        return matchCategory && matchPlace;
    });
    updateReviewSummary(summaryData);
    updateChart(summaryData);

    // แสดง Top10 หรือ Review Table
    renderReviews(data, sentiment, category, place);
}


async function toggleAddReview() {
    const categorySelect = document.getElementById('category'); 
    const placesInput = document.getElementById('places'); 
    const container = document.getElementById("review-container"); 

    if (!categorySelect || !placesInput || !container) return; // ป้องกัน element ไม่เจอ

    const category = categorySelect.value;
    const place = placesInput.value.trim();

    console.log("category =", category, "place =", place);

    // เงื่อนไขให้ container แสดงก็ต่อเมื่อ category ≠ All และ place ≠ ""
    if (category !== "All" && place !== "") {
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
}



// Event listener
document.addEventListener('DOMContentLoaded', () => {
    
    const addReviewInput = document.getElementById("addreview");
    const placesInput = document.getElementById('places');
    const sentimentSelect = document.getElementById('Result');
    const categoryAspectSelect = document.getElementById("Category_Aspect");
    const aspectSelect = document.getElementById("Aspect");
    const categorySelect = document.getElementById('category'); 

    // 2. ฟังก์ชัน updateReviewPlaceholder 
    function updateReviewPlaceholder() {
        const category = categorySelect.value;
        const place = placesInput.value.trim();
         const reviewTitle = document.getElementById("reviewTitle");

        if (category !== "All" && place !== "") {
            addReviewInput.placeholder = `Write Review For ${place}`;
            reviewTitle.textContent = `Write Review For ${place}`;
        }
        else {
            addReviewInput.placeholder = "Write Review For...";
            reviewTitle.textContent = "Write Review For";

        }
    }

    categorySelect.addEventListener("change", updateReviewPlaceholder);
    placesInput.addEventListener("input", updateReviewPlaceholder);
    

    // 3. การโหลดข้อมูลเริ่มต้น
    updateOverviewTitle();
    updatePlacesList(categorySelect.value);
    updateAllData();
    filterAndRender(); 
    renderAspectChart(); 
    toggleAddReview(); // เรียกครั้งแรกเพื่อให้ซ่อนทันที


    // 4. Event listeners
    // 4.1. Main Category Change (#category)
    categorySelect.addEventListener('change', async function() {
        
        const selectedCategory = this.value;
        placesInput.value = '';
        updateOverviewTitle(); 
        await updatePlacesList(selectedCategory);
        await filterAndRender();
        toggleAddReview(); 
        await renderAspectChart();
        
    });

    // 4.2. Place Input (#places)
    placesInput.addEventListener('input', async () => {
        updateOverviewTitle(); 
        await filterAndRender();
        toggleAddReview(); 
        await renderAspectChart();
         
    });

    // 4.3. Sentiment Select (#Result)
    sentimentSelect.addEventListener('change', async () => {
        await filterAndRender();
    });

    // 4.4. Aspect Chart Dropdowns
    categoryAspectSelect.addEventListener("change", renderAspectChart);
    aspectSelect.addEventListener("change", renderAspectChart);

    placesInput.addEventListener('input', async function() {
        const place = this.value.trim();

        if (place !== "") {
            try {
                const data = await fetchDataByPlace('');
                const found = data.find(item => item.Tourist_Attraction === place);
                if (found && found.Tourist_Attraction_Category) {
                    categorySelect.value = found.Tourist_Attraction_Category;
                }
            } catch (err) {
                console.error("fetchDataByPlace error:", err);
            }
        }

        await filterAndRender();
        toggleAddReview();
        await renderAspectChart();

        // อัปเดต placeholder/title หลังอัปเดต category เสร็จ
        updateReviewPlaceholder();
    });


    const errorMsg = document.getElementById("errorMsg");

    if (!addReviewInput || !errorMsg) return;

    addReviewInput.addEventListener("input", function () {
        const regex = /^[a-zA-Z0-9 .,!?'"()-]*$/;

        if (!regex.test(this.value)) {
            this.classList.add("error");
            errorMsg.style.display = "block";
        } else {
            this.classList.remove("error");
            errorMsg.style.display = "none";
        }
    });
});



// ปุ่มดูเพิ่มเติม / ย่อข้อความ
document.querySelector("#reviewTable tbody").addEventListener("click", function(e){
  if(e.target && e.target.classList.contains("show-more-btn")){
    const td = e.target.parentElement;
    const shortText = td.querySelector(".short-text");
    const fullText = td.querySelector(".full-text");

    if(fullText.style.display === "none"){
      shortText.style.display = "none";
      fullText.style.display = "block";
      e.target.textContent = "Less";
    } else {
      shortText.style.display = "block";
      fullText.style.display = "none";
      e.target.textContent = "More";
    }
  }
});








async function fetchTop10() {
  const label = document.getElementById("Result").value;
  const response = await fetch(`/top10?label=${label}`);
  const data = await response.json();

  const tbody = document.querySelector("#top10Table tbody");
  
const titleRow = document.getElementById("Top10Title");
if (titleRow && titleRow.firstElementChild) {
  titleRow.firstElementChild.textContent = `Top 10 Tourist Attractions with the Highest % of ${label} Reviews`;
}
  // 🔹 คำนวณ % ของ Positive/Negative
  const processedData = data.map(item => {
    const total = (item.positiveCount || 0) + (item.negativeCount || 0);
    const positivePercent = total > 0 ? ((item.positiveCount || 0) / total) * 100 : 0;
    const negativePercent = total > 0 ? ((item.negativeCount || 0) / total) * 100 : 0;

    return {
      ...item,
      positivePercent,
      negativePercent
    };
  });

  // 🔹 เลือกว่าจะเรียงตาม positivePercent หรือ negativePercent
  const sortedData = processedData.sort((a, b) => {
    if (label === "Positive") {
      return b.positivePercent - a.positivePercent;
    } else if (label === "Negative") {
      return b.negativePercent - a.negativePercent;
    } else {
      return 0; // ถ้าไม่เลือก Positive/Negative ก็ไม่ต้องเรียง
    }
  });
  tbody.innerHTML = "";
  // แสดงผล
  sortedData.slice(0, 10).forEach((item, index) => {
    const positivePercent = item.positivePercent;
    const negativePercent = item.negativePercent;
    const row = `<tr>
      <td>${index + 1}</td>
      <td>${item._id}</td>
      <td>
        <div class="bar-container">
          <div class="bar positive" style="width:${positivePercent}%; ">
            ${positivePercent.toFixed(2)}%
          </div>
          <div class="bar negative" style="width:${negativePercent}%; ">
            ${negativePercent.toFixed(2)}%
          </div>
        </div>
      </td>
    </tr>`;
    tbody.innerHTML += row;
  });
}
fetchTop10(); 


let currentCategory = document.getElementById("Category_Aspect").value; // เก็บค่าเริ่มต้น
let chartInstance = null;
const categoryAspectSelect = document.getElementById("Category_Aspect");
const aspectSelect = document.getElementById("Aspect");
const mainCategorySelect = document.getElementById("category");
const placesInput = document.getElementById("places");

// ฟังก์ชันดึง Aspects จาก backend และอัปเดต dropdown #Aspect
async function updateAspectDropdown(category) {
    if (!category || category === "All") {
        aspectSelect.innerHTML = ""; // ล้างถ้าเป็น All
        return;
    }

    const response = await fetch(`/getAspects?category=${encodeURIComponent(category)}`);
    const data = await response.json();

    // เก็บค่า Aspect ที่เลือกไว้ปัจจุบัน ก่อนจะล้าง Dropdown
    const currentlySelectedAspect = aspectSelect.value; 

    aspectSelect.innerHTML = ""; // ล้าง dropdown ก่อน

    // เอา Other ไว้ล่างสุด
    data.sort((a, b) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b); // ที่เหลือเรียง A-Z 
    });

    data.forEach(aspect => {
        const option = document.createElement("option");
        option.value = aspect;
        option.textContent = aspect;
        aspectSelect.appendChild(option);
    });

    if (data.length > 0) {
        // หากมีค่า Aspect เดิมที่เคยเลือกไว้และอยู่ในรายการใหม่ ให้คงค่านั้นไว้
        if (data.includes(currentlySelectedAspect)) {
            aspectSelect.value = currentlySelectedAspect;
        } else {
            // ถ้าไม่มีค่าเดิม หรือเป็นครั้งแรก ให้เลือกค่าแรกเป็นค่าเริ่มต้น
            aspectSelect.value = data[0]; 
        }
    }
}



//ฟังก์ชันควบคุมแผนภูมิ Aspect
async function renderAspectChart() {
    const mainCategory = mainCategorySelect.value; // ค่าจาก #category
    const place = placesInput.value.trim(); // ค่าจาก #places
    
    // ตรวจสอบว่าต้องแสดง dropdown Category/Aspect หรือไม่
    const aspectDropdownContainer = document.querySelector(".dropdownAspect"); 
    const categoryAspectDropdown = document.querySelector(".dropdownCategory");
    
    // 1. เงื่อนไขการควบคุมการแสดง Dropdown และการดึง Aspect 
    let targetCategoryForAspect = mainCategorySelect.value; 

    // เงื่อนไขการซ่อน/แสดง Dropdown 
    if (place !== "") {
        // A. ถ้ามี Place ถูกเลือก (ไม่ว่าจะเลือก Category หลักอะไร) -> ซ่อนทั้งหมด
        categoryAspectDropdown.style.display = "none";
        aspectDropdownContainer.style.display = "none";
        
        // Target Category ไม่สำคัญในโหมด Place
        targetCategoryForAspect = ""; 
    } else if (mainCategory !== "All") {
        // B. ถ้าเลือก Category หลัก (และ Place ว่าง) -> ซ่อน Category_Aspect, แสดง Aspect
        categoryAspectDropdown.style.display = "none"; 
        aspectDropdownContainer.style.display = "block";
        targetCategoryForAspect = mainCategory;
    } else { 
        // C. ถ้าเลือก All ใน Category หลัก (และ Place ว่าง) -> แสดงทั้ง Category_Aspect และ Aspect
        categoryAspectDropdown.style.display = "block"; 
        aspectDropdownContainer.style.display = "block";
        targetCategoryForAspect = categoryAspectSelect.value; // ใช้ค่าจาก Category_Aspect
    }

    // ดึง Aspects ที่ถูกต้องมาใส่ Dropdown เสมอ
    await updateAspectDropdown(targetCategoryForAspect); 

    // 2. ตรรกะการดึงข้อมูลและวาดกราฟ 
    
    let finalData = [];
    let titleText = "";
    let isAspectChart = false;
    const selectedAspect = aspectSelect.value; // ดึงค่า Aspect ที่อัปเดตแล้ว

    if (place !== "") {
        // A. เลือก Place -> แสดง Aspect Analysis ของสถานที่นั้น
        const response = await fetch(`/getStatsByPlace?place=${encodeURIComponent(place)}`);
        finalData = await response.json();
        titleText = `Sentiment (%) for aspects of ${place}`;
        isAspectChart = true;

    } else if (mainCategory !== "All") {
        // B. เลือก Category หลักอย่างเดียว (แสดง Place Analysis กรองตาม Aspect ที่เลือก)
        const response = await fetch(`/getAspectStatsByPlace?category=${encodeURIComponent(mainCategory)}&aspect=${encodeURIComponent(selectedAspect)}`);
        finalData = await response.json();
        titleText = `Sentiment (%) for ${selectedAspect} in ${mainCategory}`;
        isAspectChart = false;

    } else {
        // C. เลือก All ใน Category หลัก และ Place ว่าง -> ใช้ #Category_Aspect และ #Aspect
        const aspectCategory = categoryAspectSelect.value;
        const response = await fetch(`/getAspectStatsByPlace?category=${encodeURIComponent(aspectCategory)}&aspect=${encodeURIComponent(selectedAspect)}`);
        finalData = await response.json();
        titleText = `Sentiment (%) for ${selectedAspect} in ${aspectCategory}`;
        isAspectChart = false;
    }
    
    // วาดกราฟ
    drawHorizontalStackedChart(finalData, titleText, isAspectChart);
}

// Event listeners
document.getElementById("Category_Aspect").addEventListener("change", async () => {
    // แล้วเรียกวาดกราฟ
    await renderAspectChart();
});
document.getElementById("Aspect").addEventListener("change", renderAspectChart);
document.getElementById("category").addEventListener("change", async function() {
    await renderAspectChart(); 
});

// เมื่อเลือก Place
// ใช้ 'input' เพื่อให้โค้ดทำงานทันทีที่ผู้ใช้พิมพ์
document.getElementById("places").addEventListener("input", async function() {
    // 1. อัปเดต Review Summary, Top 10, และ Chart หลัก
    await filterAndRender(); 
    
    // 2. อัปเดต Aspect Chart (renderAspectChart จะจัดการการซ่อน/แสดง Dropdown เอง)
    await renderAspectChart();
});



// ฟังก์ชันวาดกราฟแท่งแนวนอน stacked (เรียงจากมากไปน้อย + Other ไว้ล่างสุด)
function drawHorizontalStackedChart(data, titleText, isAspect=false) {
    const processedData = data.map(d => {
        const total = d.positive + d.negative;
        const positivePercent = total === 0 ? 0 : (d.positive / total) * 100;
        const negativePercent = total === 0 ? 0 : (d.negative / total) * 100;
        return {
            label: isAspect ? d.aspect : d.place,
            positivePercent,
            negativePercent
        };
    });

    // เรียง: Other ไปล่างสุด, ที่เหลือเรียงตาม Positive มากไปน้อย
    processedData.sort((a, b) => {
        if (a.label === "Other") return 1;   // ให้ Other ไปท้าย
        if (b.label === "Other") return -1;  // ถ้า b = Other ให้ a มาก่อน
        return b.positivePercent - a.positivePercent; // ที่เหลือเรียงตาม positive%
    });

    const sortedLabels = processedData.map(d => d.label);
    const positivePercent = processedData.map(d => d.positivePercent);
    const negativePercent = processedData.map(d => d.negativePercent);

    const ctx = document.getElementById("aspectChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: sortedLabels,
            datasets: [
                { label: "Positive", data: positivePercent, backgroundColor: "#77F9AB" },
                { label: "Negative", data: negativePercent, backgroundColor: "#FF7B7B" }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                title: { display: true, text: titleText },
                tooltip: {
                    callbacks: {
                        label: function(context) { 
                            return context.dataset.label + ": " + context.raw.toFixed(1) + "%"; 
                        }
                    }
                },
                legend: { position: "top" }
            },
            scales: {
                x: { stacked: true, beginAtZero: true, max:100, title:{ display:true, text:"Percentage (%)" } },
                y: { stacked: true }
            }
        }
    });
}


/**
 * ฟังก์ชันแสดง Alert 
 * @param {string} type - 'success' หรือ 'error'
 * @param {string} title - หัวข้อหลัก
 * @param {string} line1 - ข้อความบรรทัดที่ 1
 * @param {string} line2 - ข้อความบรรทัดที่ 2 (รายละเอียด)
 */
function showCustomAlert(type, title, line1, line2) {
    const overlay = document.getElementById('custom-alert-overlay');
    const box = document.getElementById('custom-alert-box');
    const alertTitle = document.getElementById('alert-title');
    const messageLine1 = document.getElementById('alert-message-line1');
    const messageLine2 = document.getElementById('alert-message-line2');
    const okButton = document.getElementById('alert-ok-button');

    // 1. กำหนด Class (สำหรับเปลี่ยนสีตามสถานะ)
    box.className = ''; // ล้าง class เดิม
    box.classList.add(`alert-${type}`);

    // 2. กำหนดข้อความ
    alertTitle.textContent = title;
    messageLine1.textContent = line1;
    messageLine2.textContent = line2;

    // 3. แสดง Modal
    overlay.classList.remove('hidden');

    // 4. ตั้งค่าปุ่มปิด
    const closeAlert = () => {
        overlay.classList.add('hidden');
        okButton.removeEventListener('click', closeAlert); // ล้าง Listener เพื่อป้องกันการเรียกซ้ำ
    };

    okButton.addEventListener('click', closeAlert);
}
async function addReview() {
    const category = document.getElementById('category').value;
    const place = document.getElementById('places').value;
    const rawReview = document.getElementById('addreview').value;
    const reviewText = rawReview //เช็คข้อความ
      .replace(/\u00A0/g, ' ')            // NBSP → space
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/[“”]/g, '"')              // smart double quotes → "
      .replace(/[‘’]/g, "'")              // smart single quotes → '
      .replace(/[–—−]/g, '-')             // en/em/other dashes → hyphen
      .replace(/\u2026/g, '...')          // ellipsis → ...
      .replace(/\r\n/g, '\n')             // unify newlines
      .trim();

    // 1. ตรวจสอบข้อมูล
    if (!reviewText) {
        // เปลี่ยนจาก alert ธรรมดา เป็น Custom Alert สำหรับข้อความแจ้งเตือนที่ไม่ผ่าน
        showCustomAlert('error', 'Incomplete Data', 'Please enter the review text', 'Kindly check the review field and try again.');
        return;
    }

    const allowedPattern = /^[a-zA-Z0-9 .,!?'"()\-]*$/;

    if (!allowedPattern.test(reviewText)) {
        showCustomAlert('error', 'Invalid Characters', 'The review contains invalid characters.', 'Please write review in english.');
        return;
    }

    // 2. ดึงข้อมูลทั้งหมดเพื่อหา Tourist_Attraction_ThaiName 
    
    const data = await fetchDataByPlace(''); 
    let thaiName = "-";
    const found = data.find(item => item.Tourist_Attraction === place);
    if (found && found.Tourist_Attraction_ThaiName) {
        thaiName = found.Tourist_Attraction_ThaiName;
    }

    // 3. ส่งข้อมูลไป backend
    try {
        const res = await fetch('/addReview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Tourist_Attraction_ThaiName: thaiName,
                Tourist_Attraction_Category: category,
                Tourist_Attraction: place,
                Review: reviewText
            })
        });

        const dataRes = await res.json();

        // 4. จัดการผลลัพธ์ด้วย Custom Alert
        if (dataRes.success) {
            // กรณีสำเร็จ: แสดง Custom Alert ที่สวยงาม
              const title = "Review Saved Successfully!";
              const line1 = "Thank you for your review.";
              const line2 = "Sentiment Analysis Result: " + dataRes.sentiment + " | Aspect Analysis Result: " + dataRes.aspect_stripped;
            showCustomAlert('success', title, line1, line2);
            
            // ล้างช่องกรอก
            document.getElementById('addreview').value = '';

            // จัดรูปแบบให้เป็น MM/DD/YYYY HH:MM (สามารถปรับตามต้องการ)
          

        } else {
            // กรณีเกิดข้อผิดพลาดจาก Backend: แสดง Custom Alert ข้อผิดพลาด
            const title = "Failed to Save!";
            const line1 = "Review submission failed.";
            const line2 = "Error: " + (dataRes.error || "Please try again.");
            showCustomAlert('error', title, line1, line2);
        }
    } catch (error) {
        // กรณีเกิดข้อผิดพลาดในการเชื่อมต่อ (เช่น Network Error)
            const title = "Network Error";
            const line1 = "Connection to the server failed.";
            const line2 = "Check your internet connection and try again.";
        showCustomAlert('error', title, line1, line2);
    }
}






