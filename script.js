let storeRoutes = [];

document.addEventListener("DOMContentLoaded", async function () {
  // Add message event listener for loading bar control
  window.addEventListener("message", (event) => {
    if (event.data.type === "loadingBar") {
      if (event.data.value) {
        showLoading();
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
    if (event.data.type === "result_store") {
      const { type, ...rest } = event.data;
      const current_key = Object.keys(rest)[0];

      let resultStore = localStorage.getItem("result_store");
      let storeArray = [];

      if (resultStore) {
        try {
          storeArray = JSON.parse(resultStore);
        } catch (e) {
          console.error("Invalid JSON in result_store", e);
        }
      }

      const existingIndex = storeArray.findIndex((item) => current_key in item);

      if (existingIndex !== -1) {
        storeArray[existingIndex] = rest;
      } else {
        storeArray.push(rest);
      }

      localStorage.setItem("result_store", JSON.stringify(storeArray));
    }
  });

  // ---- 1. DECLARATIONS for SHARED STATE ----
  let allQuizCards = {};
  let allProducts = {};
  let categories = [];
  let currentBrand;
  let categoryMap = {};
  let currentCategory;
  let quizCards = []; // 初始化为空数组
  let currentQuizIndex;
  let quizModal, quizFrame, quizFrameDesktop, closeButton;
  let quizSwiper;
  let allDomainsSet = new Set(); // 声明全局 Set
  let allDomains = []; // 声明全局数组

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
    const apiUrl =
      "https://api.inffits.com/http_mkt_extensions_tag_proc/batch_get_routes";
    const requestBody = { num: 3 };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    categories = data.Domain_data;
    allProducts = data.Item;

    // 从 API 数据中提取 domains
    if (data && data.Item) {
      for (const brandKey in data.Item) {
        if (data.Item.hasOwnProperty(brandKey)) {
          const brand = data.Item[brandKey];
          if (brand.domain && typeof brand.domain === "string") {
            const domainParts = brand.domain.split(",");
            domainParts.forEach((part) => {
              const domains = part.split("#").filter((d) => d.length > 0);
              domains.forEach((domain) => {
                allDomainsSet.add(domain);
              });
            });
          }
        }
      }
    }

    // 将 Set 转换为数组
    allDomains = Array.from(allDomainsSet);
    // 初始化类别映射
    allDomains.forEach((domain) => {
      categoryMap[domain] = domain.toLowerCase();
    });


    // 初始化 allQuizCards 结构
    allDomains.forEach((domain) => {
      const key = categoryMap[domain];
      const currentCategoryDesc = categories.find(item => item.Domain === key)?.Description
      allQuizCards[key] = {
        desc: currentCategoryDesc? currentCategoryDesc : `${domain}的描述`,
        routes: [],
      };
    });

    // 处理 API 返回的数据
    if (data && data.Item) {
      for (const brandKey in data.Item) {
        const brand = data.Item[brandKey];
        if (brand.routes && Array.isArray(brand.routes)) {
          brand.routes.forEach((route) => {
            if (brand.domain) {
              const domains = brand.domain
                .split(",")
                .map((d) => d.split("#").filter((p) => p.length > 0))
                .flat();

              domains.forEach((domain) => {
                const categoryKey = categoryMap[domain];
                if (categoryKey && allQuizCards[categoryKey]) {

                  console.log('route', route.Imgsrc)
                  allQuizCards[categoryKey].routes.push({
                    title: route.Name || "",
                    description: route.Description || "",
                    imageUrl: route.Imgsrc || "",
                    routeId: route.Route || "",
                    brand: brandKey,
                  });
                }
              });
            }
          });
        }
      }
    }

    // 设置默认的当前类别
    if (allDomains.length > 0) {
      currentCategory = categoryMap[allDomains[0]];
      if (allQuizCards[currentCategory]) {
        quizCards = allQuizCards[currentCategory].routes;
      }
    }
    initializeApp();
  } catch (error) {
    console.error("Could not load data from API: ", error);
    hideLoading();
    const mainContentArea =
      document.querySelector(".quiz-section") || document.body;
    if (mainContentArea) {
      mainContentArea.innerHTML =
        "<p style='text-align:center; padding: 20px;'>資料載入失敗，請稍後再試。</p>";
    }
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

    // categoryMap = {
    //   服飾: "fashion",
    //   美妝保養: "beauty",
    //   電子配件: "electronics",
    //   保健食品: "health",
    //   開運好物: "fortune",
    // };

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

    // 移除这里的 Swiper 初始化，改为调用 initQuizSwiper
    initQuizSwiper();

    // 獲取所有需要的 DOM 元素
    const elements = {
      categoryButtons: document.querySelectorAll(".category-btn"),
      description: document.querySelector(".quiz-section .content-description"),
      quizSlides: document.querySelectorAll(".swiper-slide"),
      quizButtons: document.querySelectorAll(".quiz-button"),
      modal: document.getElementById("quizModal"),
      closeButton: document.querySelector(".close-button"),
      quizFrame: document.getElementById("quizFrame"),
      quizFrameDesktop: document.getElementById("quizFrame--desktop"),
      backButton: document.querySelector(".back-button"),
      tabButtons: document.querySelectorAll(".tab-button"),
      tabContents: document.querySelectorAll(".tab-content"),
      filterButtons: document.querySelectorAll(".filter-btn"),
    };

    // 根據類別名稱獲取對應的 data 屬性
    function getCategoryDataAttribute(categoryName) {
      switch (categoryName) {
        case "服飾":
          return "fashion";
        case "美妝保養":
          return "beauty";
        case "電子配件":
          return "electronics";
        case "保健食品":
          return "health";
        case "開運好物":
          return "fortune";
        default:
          return "fashion";
      }
    }

    // 顯示指定類別的卡片
    function showCategoryCards(category) {
      const dataCategory = getCategoryDataAttribute(category);
      currentCategory = dataCategory; // 更新當前類別

      // 更新描述文字
      if (allQuizCards[currentCategory]) {
        const categoryData = allQuizCards[currentCategory];
        elements.description.textContent =
          categoryData?.desc || "測驗類別資訊載入失敗。";
      }

      // 更新測驗卡片
      if (
        allQuizCards[currentCategory] &&
        allQuizCards[currentCategory].routes
      ) {
        quizCards = allQuizCards[currentCategory].routes;
        updateQuizCard(); // 重新渲染卡片
      } else {
        console.error(`無法找到類別 ${currentCategory} 的測驗卡片`);
      }

      // 重置 Swiper 到第一張卡片
      swiper.slideTo(0);
    }

    // 初始化類別切換功能
    elements.categoryButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // 移除其他按鈕的 active 類
        elements.categoryButtons.forEach((btn) =>
          btn.classList.remove("active")
        );
        // 添加當前按鈕的 active 類
        this.classList.add("active");
        // 顯示對應類別的卡片
        showCategoryCards(this.textContent);
      });
    });

    // 初始化測驗卡片點擊功能
    elements.quizButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const card = this.closest(".quiz-card");
        const title = card.querySelector(".quiz-title").textContent;
        const description = card.querySelector(".quiz-description").textContent;

        document.querySelector(".modal-title").innerHTML = title;
        document.querySelector(".modal-description").textContent = description;

        elements.modal.style.display = "block";
      });
    });

    // 初始化 Modal 關閉功能
    elements.closeButton.addEventListener("click", () => {
      elements.modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target == elements.modal) {
        elements.modal.style.display = "none";
      }
    });

    // 初始化返回按鈕功能
    elements.backButton.addEventListener("click", () => {
      window.history.back();
    });

    // 初始化頁籤切換功能
    elements.tabButtons.forEach((button, index) => {
      button.addEventListener("click", function () {
        elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
        elements.tabContents.forEach((content) =>
          content.classList.remove("active")
        );

        this.classList.add("active");
        elements.tabContents[index].classList.add("active");
      });
    });

    // 初始化品牌篩選功能
    elements.filterButtons.forEach((button) => {
      button.addEventListener("click", function () {
        elements.filterButtons.forEach((btn) => {
          btn.classList.remove("filled");
          btn.classList.add("borderless");
        });
        this.classList.remove("borderless");
        this.classList.add("filled");
      });
    });

    // 动态生成类别按钮
    const categoryButtons = document.querySelector(".category-buttons");
    if (categoryButtons && allDomains.length > 0) {
      categoryButtons.innerHTML = allDomains
        .map(
          (domain, index) => `
                <button class="category-btn ${
                  index === 0 ? "active" : ""
                }">${domain}</button>
            `
        )
        .join("");

      // 绑定类别按钮事件
      const categoryBtns = document.querySelectorAll(".category-btn");
      categoryBtns.forEach((button) => {
        button.addEventListener("click", function () {
          categoryBtns.forEach((btn) => btn.classList.remove("active"));
          this.classList.add("active");
          const category = this.textContent;
          const categoryKey = categoryMap[category];
          if (categoryKey && allQuizCards[categoryKey]) {
            currentCategory = categoryKey;
            quizCards = allQuizCards[categoryKey].routes;

            // 更新描述文字
            const description = document.querySelector(
              ".quiz-section .content-description"
            );
            if (description) {
              description.textContent =
                allQuizCards[categoryKey].desc || "測驗類別資訊載入失敗。";
            }

            updateQuizCard();
            // 更新箭头状态
            updateArrowsVisibility();
          }
        });
      });
    }
  }

  // ---- 5. DEFINITIONS of HELPER FUNCTIONS ----
  function renderProducts(brand) {
    const productList = document.querySelector(".product-list");
    const emptyResult = document.querySelector("#empty-result");
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
      emptyResult.innerHTML = `<div class="empty-state"><div class="empty-icon">
      <img src="./images/gif/start-animation.gif" alt="empty-result" width="100%" height="100%">
      </div><div class="empty-content"><p class="empty-text">想獲得貼近風格與需求的推薦?<br>前往測驗，獲得為你量身打造的推薦。</p><button class="empty-button" onclick="document.querySelector('.tab-button').click()">前往測驗</button></div></div>`;
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
      swiperWrapper.innerHTML =
        "<p style='text-align:center; padding:10px;'>目前沒有可顯示的測驗。</p>";
      return;
    }
    swiperWrapper.innerHTML = ""; // Clear previous slides
    quizCards.forEach((quiz) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      
      // 判断文件类型
      const fileExtension = quiz.imageUrl ? quiz.imageUrl.split('.').pop().toLowerCase() : '';
      let mediaContent = '';
      
      if (fileExtension === 'mp4') {
        // 如果是视频文件
        mediaContent = `
          <video class="quiz-media" autoplay loop muted playsinline>
            <source src="${quiz.imageUrl}" type="video/mp4">
          </video>
        `;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
        // 如果是图片文件
        mediaContent = `<div class="quiz-media" style="background-image:url('${quiz.imageUrl}')"></div>`;
      } else {
        // 如果是未知类型或没有图片，使用灰色背景
        mediaContent = `<div class="quiz-media quiz-media-placeholder">
        </div>`;
      }

      slide.innerHTML = `
        <div class="quiz-card">
          ${mediaContent}
          <div class="quiz-content">
            <h3 class="quiz-title">${quiz.title}</h3>
            <p class="quiz-description">${quiz.description}</p>
            <button class="quiz-button">開始測驗</button>
          </div>
        </div>
      `;
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

      // 检查是否需要禁用箭头
      const totalSlides = quizCards ? quizCards.length : 0;
      const shouldDisableArrows = totalSlides <= slidesPerViewSetting;

      // 获取箭头元素
      const leftArrow = document.querySelector(".arrow.left");
      const rightArrow = document.querySelector(".arrow.right");

      // 如果卡片数量不足，添加禁用样式
      // if (shouldDisableArrows) {
      //   if (leftArrow) {
      //     leftArrow.classList.add("arrow-disabled");
      //     leftArrow.style.pointerEvents = "none";
      //   }
      //   if (rightArrow) {
      //     rightArrow.classList.add("arrow-disabled");
      //     rightArrow.style.pointerEvents = "none";
      //   }
      // } else {
      //   if (leftArrow) {
      //     leftArrow.classList.remove("arrow-disabled");
      //     leftArrow.style.pointerEvents = "auto";
      //   }
      //   if (rightArrow) {
      //     rightArrow.classList.remove("arrow-disabled");
      //     rightArrow.style.pointerEvents = "auto";
      //   }
      // }

      quizSwiper = new Swiper(swiperContainer, {
        slidesPerView: slidesPerViewSetting,
        slidesPerGroup: slidesPerGroupSetting,
        spaceBetween: 48,
        loop: true,
        navigation: {
          nextEl: ".arrow.right",
          prevEl: ".arrow.left",
          disabledClass: "arrow-disabled",
        },
        speed: 500,
        watchSlidesProgress: true,
        watchSlidesVisibility: true,
        resistance: true,
        resistanceRatio: 0.85,
        on: {
          init: function () {
            // 初始化时更新箭头状态
            this.navigation.update();
          },
          slideChange: function () {
            // 滑动变化时更新箭头状态
            this.navigation.update();
          },
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

  // 添加一个全局函数来处理箭头状态
  function updateArrowsVisibility() {
    const leftArrow = document.querySelector(".arrow.left");
    const rightArrow = document.querySelector(".arrow.right");
    const totalSlides = quizCards ? quizCards.length : 0;
    const windowWidth = window.innerWidth;
    let slidesPerViewSetting = 1;

    if (windowWidth >= 1024) {
      slidesPerViewSetting = 3;
    } else if (windowWidth >= 768) {
      slidesPerViewSetting = 2;
    }

    if (totalSlides <= slidesPerViewSetting) {
      if (leftArrow) leftArrow.style.display = "none";
      if (rightArrow) rightArrow.style.display = "none";
    } else {
      if (leftArrow) leftArrow.style.display = "block";
      if (rightArrow) rightArrow.style.display = "block";
    }
  }

  // 在窗口大小改变时也更新箭头状态
  window.addEventListener(
    "resize",
    debounce(function () {
      if (document.querySelector(".tab-content.quiz-section.active")) {
        initQuizSwiper();
        updateArrowsVisibility();
      }
    }, 250)
  );

  function updateQuizCard() {
    // console.log("更新測驗卡片");
    renderQuizCards();
    initQuizSwiper();
    bindQuizButtonEvent();
    // 在更新卡片后也更新箭头状态
    updateArrowsVisibility();
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
      "http://127.0.0.1:5502/iframe_container_module.html?d=referral";
    // console.log(
    //   `Attempting to open quiz: ${activeQuizCard.title} with URL: ${actualQuizUrl}`
    // );
    quizFrame.src = actualQuizUrl;
    quizFrame.onload = function () {
      // console.log("iframe has loaded. Sending postMessage.");
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
    // console.log("找到的按鈕數量:", buttons.length);

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
        if (quizDetailContainer) {
          // 更新卡片內容
          const detailMediaContainer = quizDetailContainer.querySelector(".quiz-detail-media-container");
          const detailTitle = quizDetailContainer.querySelector(".quiz-detail-title");
          const detailDescription = quizDetailContainer.querySelector(".quiz-detail-description");

          if (detailMediaContainer) {
            // 判断文件类型
            const fileExtension = activeQuiz.imageUrl ? activeQuiz.imageUrl.split('.').pop().toLowerCase() : '';
            let mediaContent = '';

            if (fileExtension === 'mp4') {
              // 如果是视频文件
              mediaContent = `
                <video class="quiz-detail-media" autoplay loop muted playsinline>
                  <source src="${activeQuiz.imageUrl}" type="video/mp4">
                </video>
              `;
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
              // 如果是图片文件
              mediaContent = `<img src="${activeQuiz.imageUrl}" alt="測驗圖片" class="quiz-detail-media">`;
            } else {
              // 如果是未知类型或没有图片，使用灰色背景
              mediaContent = `<div class="quiz-detail-media quiz-detail-media-placeholder"></div>`;
            }

            detailMediaContainer.innerHTML = mediaContent;
          }

          if (detailTitle) {
            detailTitle.textContent = activeQuiz.title;
            console.log("設置標題:", activeQuiz.title);
          }
          if (detailDescription) {
            detailDescription.textContent = activeQuiz.description;
            console.log("設置描述:", activeQuiz.description);
          }

          quizFrameDesktop = document.getElementById("quizFrame--desktop");
          quizFrameDesktop.src = "";
          quizFrameDesktop.src =
            "http://127.0.0.1:5502/iframe_container_module.html?d=referral";
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
    filterButtonsContainer.display = 'none'
    return
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
