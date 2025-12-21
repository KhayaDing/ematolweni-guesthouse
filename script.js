const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".hero-dot"));
const prevBtn = document.querySelector(".hero-arrow-left");
const nextBtn = document.querySelector(".hero-arrow-right");

let currentSlide = 0;
let sliderInterval;

function setActiveSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
  currentSlide = index;
}

function nextSlide() {
  const target = (currentSlide + 1) % slides.length;
  setActiveSlide(target);
}

function prevSlide() {
  const target = (currentSlide - 1 + slides.length) % slides.length;
  setActiveSlide(target);
}

function startAutoSlide() {
  stopAutoSlide();
  sliderInterval = setInterval(nextSlide, 7000);
}

function stopAutoSlide() {
  if (sliderInterval) clearInterval(sliderInterval);
}

if (slides.length > 0) {
  startAutoSlide();

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      setActiveSlide(index);
      startAutoSlide();
    });
  });

  if (nextBtn && prevBtn) {
    nextBtn.addEventListener("click", () => {
      nextSlide();
      startAutoSlide();
    });
    prevBtn.addEventListener("click", () => {
      prevSlide();
      startAutoSlide();
    });
  }
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href") || "";
    if (href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: "smooth",
        });
      }
    }
  });
});



// Sticky navigation scroll effect
const topBar = document.querySelector(".top-bar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    topBar.classList.add("scrolled");
  } else {
    topBar.classList.remove("scrolled");
  }
});






// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById("mobile-menu");
const mainNav = document.querySelector(".main-nav");

if (mobileMenuBtn && mainNav) {
  mobileMenuBtn.addEventListener("click", () => {
    mainNav.classList.toggle("active");
  });

  // Close menu when clicking a link
  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("active");
    });
  });
}

// Back to Top functionality
const backToTopBtn = document.getElementById("backToTop");

if (backToTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add("visible");
    } else {
      backToTopBtn.classList.remove("visible");
    }
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Enhanced Gallery Lightbox
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("img01");
const captionText = document.getElementById("caption");
const closeBtn = document.querySelector(".close-modal");
const prevBtnLightbox = document.querySelector(".lightbox-nav.prev");
const nextBtnLightbox = document.querySelector(".lightbox-nav.next");
const galleryImages = Array.from(document.querySelectorAll(".gallery-card img"));

let currentImageIndex = 0;

function openLightbox(index) {
  if (!modal) return;
  currentImageIndex = index;
  const img = galleryImages[index];

  modal.style.display = "flex"; // Changed to flex for centering
  modal.setAttribute("aria-hidden", "false");
  modalImg.src = img.src;
  modalImg.alt = img.alt;
  if (captionText) captionText.innerHTML = img.alt;
  document.body.style.overflow = "hidden"; // Prevent scrolling
}

function closeLightbox() {
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto"; // Restore scrolling

  // Clean up any fallback styles
  modalImg.style.opacity = "";
}

function changeImage(step) {
  currentImageIndex = (currentImageIndex + step + galleryImages.length) % galleryImages.length;
  const img = galleryImages[currentImageIndex];

  // Simple fade effect
  modalImg.style.opacity = 0;
  setTimeout(() => {
    modalImg.src = img.src;
    modalImg.alt = img.alt;
    if (captionText) captionText.innerHTML = img.alt;
    modalImg.style.opacity = 1;
  }, 200);
}

// Expose legacy function for existing onclick attributes in HTML
window.openImageModal = function (src) {
  // Find index of image with this src by checking if src ends with it or contains it
  // The src passed from HTML might be relative 'images/foo.jpg'
  const index = galleryImages.findIndex(img => img.getAttribute('src') === src || img.src.includes(src));
  if (index !== -1) {
    openLightbox(index);
  } else {
    // Fallback
    if (modal) {
      modal.style.display = "flex";
      modalImg.src = src;
    }
  }
};

if (modal) {
  // Event delegation for gallery cards (alternative to inline onclick)
  // We don't remove inline onclicks, but the window.openImageModal override handles them.
  // Also add explicit listeners if needed, but the override is safer for validity.

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);

  // Close on clicking outside image
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains('modal-content-wrapper')) closeLightbox();
  });

  if (prevBtnLightbox) {
    prevBtnLightbox.addEventListener("click", (e) => {
      e.stopPropagation();
      changeImage(-1);
    });
  }

  if (nextBtnLightbox) {
    nextBtnLightbox.addEventListener("click", (e) => {
      e.stopPropagation();
      changeImage(1);
    });
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "flex" || modal.style.display === "block") {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") changeImage(-1);
      if (e.key === "ArrowRight") changeImage(1);
    }
  });
}


// Contact Form Feedback
const contactForm = document.querySelector(".contact-form");
// const successMsg = document.getElementById("form-success"); // already defined or not present?

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    const btn = contactForm.querySelector("button[type='submit']");
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;

      // Since it's Netlify, it will redirect. 
      // If we wanted to stay on page we'd need AJAX but standard form submission is robust.
    }
  });
}
