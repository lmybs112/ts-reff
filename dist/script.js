document.addEventListener("DOMContentLoaded", async function () {
  // Add message event listener for loading bar control
  window.addEventListener("message", (event) => {
    if (event.data.type === "loadingBar") {
      if (event.data.value) {
        // showLoading();
      } else {
        // Close modal on mobile devices
        if (quizModal) {
          quizModal.style.display = "none";
          if (quizFrame) quizFrame.src = "";
          // Switch to result section
          const resultButton = document.querySelector(
            ".tab-button:nth-child(2)"
          );
          if (resultButton) {
            resultButton.click();
          }
        }
        hideLoading();
      }
    }
  });

  // ---- 1. DECLARATIONS for SHARED STATE ----
  let allQuizCards = {};
  let allProducts = {};
  let currentBrand;
  let categoryMap;
  let currentCategory;
  let quizCards; // Declaration for quizCards, should be accessible throughout this scope
  let currentQuizIndex;
  let quizModal, quizFrame, quizFrameDesktop, closeButton;
  let quizSwiper; // Added declaration for quizSwiper here

  // ---- 2. DOM Element selections & Utility functions & Static Data ----
  const loadingScreen = document.querySelector(".loading-screen");
  const loadingSpinner = document.querySelector(".loading-spinner");
  const images = [
    "images/hero/hero-image-1.png",
    "images/hero/hero-image-2.png",
    "images/hero/hero-image-3.png",
    "images/hero/hero-image-4.png",
    "images/hero/hero-image-5.png",
    "images/hero/hero-image-6.png",
    "images/hero/hero-image-7.png",
    "images/hero/hero-image-8.png",
    "images/hero/hero-image-9.png",
    "images/hero/hero-image-10.png",
  ];

  function showLoading() {
    const loadingBar = loadingSpinner.querySelector("::before");
    if (loadingBar) {
      loadingBar.style.animation = "none";
      loadingBar.offsetHeight;
      loadingBar.style.animation = null;
    }
    loadingScreen.style.zIndex = "999999";
    loadingScreen.classList.remove("active");
    setTimeout(() => {
      loadingScreen.classList.add("active");
    }, 10);
  }

  function hideLoading() {
    setTimeout(() => {
      loadingScreen.classList.remove("active");
      loadingScreen.style.zIndex = "";
    }, 2500);
  }

  // ---- 3. MAIN LOGIC (fetch and initializeApp call) ----
  // showLoading();
  try {
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allQuizCards = data.allQuizCards;
    allProducts = data.allProducts;
    initializeApp();
  } catch (error) {
    console.error("Could not load data.json: ", error);
    hideLoading();
    // Display error to user on the page if necessary
    const mainContentArea =
      document.querySelector(".quiz-section") || document.body; // Fallback to body
    if (mainContentArea)
      mainContentArea.innerHTML =
        "<p style='text-align:center; padding: 20px;'>資料載入失敗，請稍後再試。</p>";
    return;
  }

  // ---- 4. DEFINITION of initializeApp ----
  function initializeApp() {
    // Image preloading
    let loadedImages = 0;
    const totalImages = images.length;
    if (totalImages === 0) {
      // Handle case with no images to preload
      hideLoading();
    } else {
      images.forEach((src) => {
        const img = new Image();
        img.onload = () => {
          loadedImages++;
          if (loadedImages >= totalImages) {
            hideLoading();
          }
        };
        img.onerror = () => {
          loadedImages++;
          console.error("图像加载失败:", src);
          if (loadedImages >= totalImages) {
            hideLoading();
          }
        };
        img.src = src;
      });
    }

    const scrollContents = document.querySelectorAll(".hero-scroll-content");
    scrollContents.forEach((content) => {
      const isUp = content.parentElement.classList.contains("hero-scroll--up");
      const imageList = isUp ? images : images.slice().reverse();
      imageList.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        content.appendChild(img);
      });
      imageList.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        content.appendChild(img);
      });
    });

    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const categoryQuizWrapper = document.querySelector(
      ".category-quiz-wrapper"
    );
    tabButtons.forEach((button, index) => {
      button.addEventListener("click", function () {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
        categoryQuizWrapper.classList.add("active");
        tabContents.forEach((content) => content.classList.remove("active"));
        if (tabContents[index]) tabContents[index].classList.add("active");
        const backButton = document.querySelector(".back-button");
        if (backButton) {
          backButton.click();
        }
      });
    });

    // Assignments to shared state variables from fetched data
    if (allProducts && Object.keys(allProducts).length > 0) {
      currentBrand = Object.keys(allProducts)[0];
    } else {
      console.error(
        "allProducts is undefined or empty. Cannot set currentBrand."
      );
      currentBrand = undefined;
    }

    categoryMap = {
      服飾: "fashion",
      美妝保養: "beauty",
      電子配件: "electronics",
      保健食品: "health",
      開運好物: "fortune",
    };

    if (allQuizCards && Object.keys(allQuizCards).length > 0) {
      currentCategory = Object.keys(allQuizCards)[0];
      if (
        allQuizCards[currentCategory] &&
        allQuizCards[currentCategory].routes
      ) {
        quizCards = allQuizCards[currentCategory].routes; // Assignment to quizCards
      } else {
        console.error(
          `Routes not found for currentCategory: ${currentCategory}. Defaulting to empty array.`
        );
        quizCards = [];
      }
    } else {
      console.error(
        "allQuizCards is undefined or empty. Cannot set currentCategory or quizCards. Defaulting to empty array."
      );
      currentCategory = undefined;
      quizCards = [];
    }
    currentQuizIndex = 0;

    const quizContentDescription = document.querySelector(
      ".quiz-section .content-description"
    );
    if (quizContentDescription) {
      if (currentCategory && allQuizCards[currentCategory]) {
        const categoryData = allQuizCards[currentCategory];
        quizContentDescription.textContent = categoryData?.desc;
      } else {
        quizContentDescription.textContent = "測驗類別資訊載入失敗。";
      }
    }

    quizModal = document.getElementById("quizModal");
    quizFrame = document.getElementById("quizFrame");
    closeButton = document.querySelector(".modal .close-button");

    if (closeButton) {
      closeButton.onclick = function () {
        if (quizModal) quizModal.style.display = "none";
        if (quizFrame) quizFrame.src = "";
      };
    } else {
      console.warn("Modal close button not found.");
    }

    window.addEventListener("click", function (event) {
      if (event.target == quizModal) {
        if (quizModal) quizModal.style.display = "none";
        if (quizFrame) quizFrame.src = "";
      }
    });

    updateQuizCard();
    renderFilterButtons();
    if (currentBrand) {
      renderProducts(currentBrand);
    } else {
      const productList = document.querySelector(".product-list");
      if (productList)
        productList.innerHTML =
          "<p style='text-align:center; padding: 20px;'>商品品牌資訊載入失敗。</p>";
    }

    const scrollItems = document.querySelectorAll(".scroll-item");
    scrollItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = "1";
      }, (150 * index) % 8);
    });

    // 初始化 Swiper
    const swiper = new Swiper('.quiz-card-container', {
        slidesPerView: 'auto',
        spaceBetween: 20,
        navigation: {
            nextEl: '.arrow.right',
            prevEl: '.arrow.left',
        }
    });

    // 獲取所有需要的 DOM 元素
    const elements = {
        categoryButtons: document.querySelectorAll('.category-btn'),
        description: document.querySelector('.quiz-section .content-description'),
        quizSlides: document.querySelectorAll('.swiper-slide'),
        quizButtons: document.querySelectorAll('.quiz-button'),
        modal: document.getElementById('quizModal'),
        closeButton: document.querySelector('.close-button'),
        quizFrame: document.getElementById('quizFrame'),
        quizFrameDesktop: document.getElementById('quizFrame--desktop'),
        backButton: document.querySelector('.back-button'),
        tabButtons: document.querySelectorAll('.tab-button'),
        tabContents: document.querySelectorAll('.tab-content'),
        filterButtons: document.querySelectorAll('.filter-btn')
    };

    // 根據類別名稱獲取對應的 data 屬性
    function getCategoryDataAttribute(categoryName) {
        switch(categoryName) {
            case '服飾': return 'fashion';
            case '美妝保養': return 'beauty';
            case '電子配件': return 'electronics';
            case '保健食品': return 'health';
            case '開運好物': return 'fortune';
            default: return 'fashion';
        }
    }

    // 顯示指定類別的卡片
    function showCategoryCards(category) {
        const dataCategory = getCategoryDataAttribute(category);
        
        // 更新描述文字
        if (currentCategory && allQuizCards[currentCategory]) {
            const categoryData = allQuizCards[currentCategory];
            elements.description.textContent = categoryData?.desc || "測驗類別資訊載入失敗。";
        }

        // 更新卡片顯示並重置 Swiper 到第一張卡片
        swiper.slideTo(0);
    }

    // 初始化類別切換功能
    elements.categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            showCategoryCards(this.textContent);
        });
    });

    // 初始化測驗卡片點擊功能
    elements.quizButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.quiz-card');
            const title = card.querySelector('.quiz-title').textContent;
            const description = card.querySelector('.quiz-description').textContent;
            
            document.querySelector('.modal-title').innerHTML = title.split('|')[0] + '<br/>' + title.split('|')[1];
            document.querySelector('.modal-description').textContent = description;
            
            elements.modal.style.display = 'block';
        });
    });

    // 初始化 Modal 關閉功能
    elements.closeButton.addEventListener('click', () => {
        elements.modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == elements.modal) {
            elements.modal.style.display = 'none';
        }
    });

    // 初始化返回按鈕功能
    elements.backButton.addEventListener('click', () => {
        window.history.back();
    });

    // 初始化頁籤切換功能
    elements.tabButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            elements.tabContents[index].classList.add('active');
        });
    });

    // 初始化品牌篩選功能
    elements.filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            elements.filterButtons.forEach(btn => {
                btn.classList.remove('filled');
                btn.classList.add('borderless');
            });
            this.classList.remove('borderless');
            this.classList.add('filled');
        });
    });
  }

  // ---- 5. DEFINITIONS of HELPER FUNCTIONS ----
  function renderProducts(brand) {
    const productList = document.querySelector(".product-list");
    if (!productList) return;
    const brandData = allProducts[brand];
    const contentDescriptionEl = document.querySelector(
      ".result-section .content-description"
    );
    if (contentDescriptionEl) {
      contentDescriptionEl.textContent =
        brandData?.desc || "目前尚未開始你的推薦旅程。";
    }
    if (!brandData || !brandData.products || brandData.products.length === 0) {
      productList.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.11761 2.11761H69.8824V69.8824H2.11761V2.11761Z" fill="url(#paint0_linear_6419_8935)"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3.38824 3.38824V68.6118H68.6118V3.38824H3.38824ZM2.11761 2.11761V69.8824H69.8824V2.11761H2.11761Z" fill="#1E1E19"/><path d="M39.7737 41.8228L57.7641 59.8131" stroke="#1E1E19" stroke-width="0.294118"/><path d="M29.9035 15.7494L42.2773 28.1232" fill="#1E1E19"/><rect x="44.0098" y="46.1272" width="20.4816" height="20.4816" rx="3.52941" fill="#1E1E19"/><defs><linearGradient id="paint0_linear_6419_8935" x1="0" y1="36" x2="69.8824" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#F9FE9F"/><stop offset="1" stop-color="#CBE2E2"/></linearGradient></defs></svg></div><div class="empty-content"><p class="empty-text">想獲得貼近風格與需求的推薦?<br>前往測驗，獲得為你量身打造的推薦。</p><button class="empty-button" onclick="document.querySelector('.tab-button').click()">前往測驗</button></div></div>`;
      return;
    }
    productList.innerHTML = brandData.products
      .map(
        (product) =>
          `<div class="product-card"><div class="product-image" style="background-image: url('${product.imageUrl}')"></div><div class="product-info"><h3 class="product-title">${product.title}</h3><div class="price-info"><span class="price-current">$ ${product.currentPrice}</span><span class="price-original">$ ${product.originalPrice}</span></div></div></div>`
      )
      .join("");
  }

  function renderQuizCards() {
    const swiperWrapper = document.querySelector(
      ".quiz-card-container .swiper-wrapper"
    );
    if (!swiperWrapper) {
      console.error("Swiper wrapper not found for quiz cards.");
      return;
    }
    if (!quizCards || !Array.isArray(quizCards)) {
      // Guard against quizCards not being an array
      console.error(
        "renderQuizCards called but quizCards is not a valid array. Current value:",
        quizCards
      );
      swiperWrapper.innerHTML =
        "<p style='text-align:center; padding:10px;'>測驗卡片資料錯誤。</p>";
      return;
    }
    if (quizCards.length === 0) {
      console.warn("renderQuizCards called with empty quizCards array.");
      // Optionally, display an empty state specific to quiz cards
      swiperWrapper.innerHTML =
        "<p style='text-align:center; padding:10px;'>目前沒有可顯示的測驗。</p>";
      // return; // Or allow swiper to initialize with no slides if that's preferred
    }
    swiperWrapper.innerHTML = ""; // Clear previous slides
    quizCards.forEach((quiz) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.innerHTML = `<div class="quiz-card"><div class="quiz-image" style="background-image:url('${quiz.imageUrl}')"></div><div class="quiz-content"><h3 class="quiz-title">${quiz.title}</h3><p class="quiz-description">${quiz.description}</p><button class="quiz-button">開始測驗</button></div></div>`;
      swiperWrapper.appendChild(slide);
    });
  }

  function initQuizSwiper() {
    if (quizSwiper) {
      quizSwiper.destroy(true, true);
      quizSwiper = null;
    }

    const swiperContainer = document.querySelector(
      ".quiz-card-container.swiper"
    );
    if (swiperContainer) {
      let slidesPerViewSetting = 1;
      let slidesPerGroupSetting = 1;
      const windowWidth = window.innerWidth;

      if (windowWidth >= 1024) {
        slidesPerViewSetting = 3;
        slidesPerGroupSetting = 3;
      } else if (windowWidth >= 768) {
        slidesPerViewSetting = 2;
        slidesPerGroupSetting = 2;
      }

      quizSwiper = new Swiper(swiperContainer, {
        slidesPerView: slidesPerViewSetting,
        slidesPerGroup: slidesPerGroupSetting,
        spaceBetween: 48,
        loop: quizCards && quizCards.length > slidesPerViewSetting,
        navigation: {
          nextEl: ".arrow.right",
          prevEl: ".arrow.left",
        },
      });
    } else {
      console.warn("Swiper container not found for quiz cards.");
    }
  }

  // Debounce function
  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  // Call initQuizSwiper on window resize (debounced)
  window.addEventListener(
    "resize",
    debounce(function () {
      // We might need to re-render quiz cards if their structure needs to change for different views
      // For now, just re-initializing swiper based on new width.
      if (document.querySelector(".tab-content.quiz-section.active")) {
        // Only if quiz section is active
        initQuizSwiper();
      }
    }, 250)
  );

  function updateQuizCard() {
    console.log("更新測驗卡片");
    renderQuizCards();
    initQuizSwiper();
    bindQuizButtonEvent();
  }

  function openQuizInModal(activeQuizCard) {
    if (!quizModal || !quizFrame) {
      console.error("Modal elements not found!");
      return;
    }
    if (
      !activeQuizCard ||
      typeof activeQuizCard.title === "undefined" ||
      typeof activeQuizCard.description === "undefined"
    ) {
      console.error(
        "Invalid quiz data passed to openQuizInModal",
        activeQuizCard
      );
      // Optionally, set default title/description or close modal
      const modalTitleElement = document.querySelector(
        ".modal-content .modal-title"
      );
      if (modalTitleElement) modalTitleElement.innerHTML = "測驗資訊錯誤";
      const modalDescElement = document.querySelector(
        ".modal-content .modal-description"
      );
      if (modalDescElement)
        modalDescElement.innerHTML = "抱歉，載入測驗詳細資訊時發生問題。";
      quizModal.style.display = "block"; // Still display modal to show error
      return;
    }

    // Update the modal title dynamically
    const modalTitleElement = document.querySelector(
      ".modal-content .modal-title"
    );
    if (modalTitleElement) {
      modalTitleElement.innerHTML = activeQuizCard.title;
    } else {
      console.warn(
        "Modal title element (.modal-title) not found inside .modal-content."
      );
    }

    // Update the modal description dynamically
    const modalDescElement = document.querySelector(
      ".modal-content .modal-description"
    );
    if (modalDescElement) {
      modalDescElement.innerHTML = activeQuizCard.description; // Use innerHTML for description as well
    } else {
      console.warn(
        "Modal description element (.modal-description) not found inside .modal-content."
      );
    }

    const actualQuizUrl =
      "https://ts-iframe-v2.vercel.app/iframe_container_module.html?d=referral";
    console.log(
      `Attempting to open quiz: ${activeQuizCard.title} with URL: ${actualQuizUrl}`
    );
    quizFrame.src = actualQuizUrl;
    quizFrame.onload = function () {
      console.log("iframe has loaded. Sending postMessage.");
      const iframe_preview_obj = {
        id: activeQuizCard.routeId,
        header: "from_preview",
        brand: activeQuizCard.brand,
      };
      if (quizFrame.contentWindow) {
        quizFrame.contentWindow.postMessage(iframe_preview_obj, "*");
      } else {
        console.error("iframe contentWindow is not available.");
      }
    };
    quizModal.style.display = "block";
  }

  function bindQuizButtonEvent() {
    const buttons = document.querySelectorAll(".quiz-button");
    console.log("找到的按鈕數量:", buttons.length);

    buttons.forEach((btn) => {
      // 移除舊的事件監聽器
      btn.removeEventListener("click", handleQuizButtonClick);
      // 添加新的事件監聽器
      btn.addEventListener("click", handleQuizButtonClick);
    });

    // 返回按鈕事件
    const backButton = document.querySelector(".back-button");
    if (backButton) {
      backButton.removeEventListener("click", handleBackButtonClick);
      backButton.addEventListener("click", handleBackButtonClick);
    }
  }

  function handleQuizButtonClick(event) {
    console.log("按鈕被點擊");

    // 找到當前點擊的卡片
    const clickedCard = event.target.closest(".quiz-card");
    if (!clickedCard) {
      console.error("找不到被點擊的卡片");
      return;
    }

    // 找到卡片在容器中的索引
    const allCards = document.querySelectorAll(".swiper-slide");
    const cardIndex = Array.from(allCards).findIndex((card) =>
      card.contains(clickedCard)
    );
    console.log("點擊的卡片索引:", cardIndex);

    if (cardIndex === -1 || !quizCards || !quizCards[cardIndex]) {
      console.error("無法獲取卡片數據");
      return;
    }

    const activeQuiz = quizCards[cardIndex];
    console.log("當前選中的測驗:", activeQuiz);
    if (activeQuiz.title) {
      if (window.innerWidth >= 768) {
        // 平板以上：顯示 quiz-detail-container
        const quizDetailContainer = document.querySelector(
          ".quiz-detail-container"
        );
        console.log("找到 detail container:", quizDetailContainer);

        if (quizDetailContainer) {
          // 更新卡片內容
          const detailImage =
            quizDetailContainer.querySelector(".quiz-detail-image");
          const detailTitle =
            quizDetailContainer.querySelector(".quiz-detail-title");
          const detailDescription = quizDetailContainer.querySelector(
            ".quiz-detail-description"
          );
          console.log("更新前的元素:", {
            image: detailImage,
            title: detailTitle,
            description: detailDescription,
          });

          quizFrameDesktop = document.getElementById("quizFrame--desktop");
          quizFrameDesktop.src = "";
          quizFrameDesktop.src =
            "https://ts-iframe-v2.vercel.app/iframe_container_module.html?d=referral";
          quizFrameDesktop.onload = function () {
            console.log("iframe has loaded. Sending postMessage.");
            const iframe_preview_obj = {
              id: activeQuiz.routeId,
              header: "from_preview",
              brand: activeQuiz.brand,
            };
            if (quizFrameDesktop.contentWindow) {
              quizFrameDesktop.contentWindow.postMessage(
                iframe_preview_obj,
                "*"
              );
            } else {
              console.error("iframe contentWindow is not available.");
            }
          };

          if (detailImage) {
            detailImage.src = activeQuiz.imageUrl;
            console.log("設置圖片:", activeQuiz.imageUrl);
          }
          if (detailTitle) {
            detailTitle.textContent = activeQuiz.title;
            console.log("設置標題:", activeQuiz.title);
          }
          if (detailDescription) {
            detailDescription.textContent = activeQuiz.description;
            console.log("設置描述:", activeQuiz.description);
          }

          quizDetailContainer.classList.add("active");
          // 隱藏其他內容
          const categoryQuizWrapper = document.querySelector(
            ".category-quiz-wrapper"
          );
          categoryQuizWrapper.classList.remove("active");
        }
      } else {
        // 手機版：使用 Modal
        openQuizInModal(activeQuiz);
      }
    } else {
      console.error(
        "Selected quiz card is missing a title. Index:",
        cardIndex,
        "quizCard:",
        activeQuiz
      );
    }
  }

  function handleBackButtonClick() {
    const quizDetailContainer = document.querySelector(
      ".quiz-detail-container"
    );
    const categoryQuizWrapper = document.querySelector(
      ".category-quiz-wrapper"
    );
    if (quizDetailContainer) {
      quizDetailContainer.classList.remove("active");
      // 清空卡片內容
      const detailImage =
        quizDetailContainer.querySelector(".quiz-detail-image");
      if (detailImage) detailImage.src = "";
    }
    if (categoryQuizWrapper) {
      categoryQuizWrapper.classList.add("active");
    }
  }

  function renderFilterButtons() {
    const filterButtonsContainer = document.querySelector(".filter-buttons");
    if (!filterButtonsContainer) return;
    const brands = allProducts ? Object.keys(allProducts) : []; // Ensure allProducts exists
    filterButtonsContainer.innerHTML = brands
      .map(
        (brand, index) =>
          `<button class="filter-btn ${
            index === 0 ? "filled" : "borderless"
          }">${brand}</button>`
      )
      .join("");
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach((button) => {
      button.addEventListener("click", function () {
        filterButtons.forEach((btn) => {
          btn.classList.remove("filled");
          btn.classList.add("borderless");
        });
        this.classList.remove("borderless");
        this.classList.add("filled");
        const selectedBrand = this.textContent;
        currentBrand = selectedBrand;
        const resultDesc = document.querySelector(
          ".result-section .content-description"
        );
        if (resultDesc && allProducts[selectedBrand]) {
          resultDesc.textContent =
            allProducts[selectedBrand]?.desc || "目前尚未開始你的推薦旅程。";
        }
        renderProducts(selectedBrand);
      });
    });
  }
});

// Global touch handlers (remain unchanged)
document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);
let xDown = null;
let yDown = null;
function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
  yDown = evt.touches[0].clientY;
}
function handleTouchMove(evt) {
  if (!xDown || !yDown) {
    return;
  }
  const xUp = evt.touches[0].clientX;
  const yUp = evt.touches[0].clientY;
  const xDiff = xDown - xUp;
  const yDiff = yDown - yUp;
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    const targetArrowSelector = xDiff > 0 ? ".arrow.right" : ".arrow.left";
    const arrowElement = document.querySelector(targetArrowSelector);
    if (arrowElement) arrowElement.click();
  }
  xDown = null;
  yDown = null;
}
