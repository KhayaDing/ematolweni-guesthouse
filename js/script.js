// Progressive enhancement only: static content is rendered at build time.
// Carousel Implementation
const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".hero-dot"));
const prevBtn = document.querySelector(".hero-arrow-left");
const nextBtn = document.querySelector(".hero-arrow-right");

let currentSlide = 0;
let sliderInterval = null;
let preloadTimer = null;
let slideRequest = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
const slideLoads = new WeakMap();

function loadSlide(index) {
  const slide = slides[index];
  if (!slide) return Promise.resolve();
  if (slideLoads.has(slide)) return slideLoads.get(slide);
  const img = slide.querySelector("img");
  const ready = (async () => {
    slide.querySelectorAll("source[data-srcset]").forEach(source => {
      source.srcset = source.dataset.srcset;
      delete source.dataset.srcset;
    });
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
    if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
    await img.decode();
    if (!img.naturalWidth) throw new Error("Slide did not load");
  })();
  slideLoads.set(slide, ready);
  ready.catch(() => slideLoads.delete(slide));
  return ready;
}

async function setActiveSlide(index) {
  if (!slides.length) return;
  const request = ++slideRequest;
  // Keep the current image visible until the requested image is decoded.
  try { await loadSlide(index); } catch { return; }
  if (request !== slideRequest) return;
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
    slide.inert = i !== index;
    slide.setAttribute("aria-hidden", String(i !== index));
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
  currentSlide = index;
}

function startAutoSlide() {
  clearTimeout(sliderInterval);
  clearTimeout(preloadTimer);
  if (!slides.length || reducedMotion.matches || connection?.saveData || document.hidden) return;
  // Load just before the 7-second transition, never during initial parsing.
  preloadTimer = setTimeout(() => loadSlide((currentSlide + 1) % slides.length).catch(() => {}), 5500);
  sliderInterval = setTimeout(async () => {
    await setActiveSlide((currentSlide + 1) % slides.length);
    startAutoSlide();
  }, 7000);
}

if (slides.length > 0) {
  setActiveSlide(0).then(startAutoSlide);
  reducedMotion.addEventListener("change", startAutoSlide);
  connection?.addEventListener("change", startAutoSlide);
  document.addEventListener("visibilitychange", startAutoSlide);
  const navigateSlide = async index => {
    clearTimeout(sliderInterval);
    clearTimeout(preloadTimer);
    await setActiveSlide(index);
    startAutoSlide();
  };

  dots.forEach((dot, index) => {
    dot.setAttribute("aria-label", `Show slide ${index + 1}`);
    dot.addEventListener("click", () => navigateSlide(index));
  });

  if (nextBtn && prevBtn) {
    nextBtn.addEventListener("click", () => {
      navigateSlide((currentSlide + 1) % slides.length);
    });
    prevBtn.addEventListener("click", () => {
      navigateSlide((currentSlide - 1 + slides.length) % slides.length);
    });
  }
}

// Start the muted tour when it becomes visible, while respecting user preferences.
const aboutVideo = document.getElementById("about-video");
const videoPlay = document.getElementById("video-play");
if (aboutVideo && videoPlay) {
  let videoIsVisible = !("IntersectionObserver" in window);

  const loadAboutVideo = () => {
    if (!aboutVideo.src) { aboutVideo.src = aboutVideo.dataset.src; aboutVideo.load(); }
  };

  const playAboutVideo = async () => {
    loadAboutVideo();
    aboutVideo.controls = true;
    try {
      await aboutVideo.play();
      videoPlay.hidden = true;
    } catch {
      videoPlay.hidden = false;
    }
  };

  const syncAboutVideo = () => {
    const autoplayAllowed = !reducedMotion.matches && !connection?.saveData;
    if (document.hidden || !videoIsVisible) {
      aboutVideo.pause();
    } else if (autoplayAllowed) {
      playAboutVideo();
    } else {
      videoPlay.hidden = false;
    }
  };

  videoPlay.addEventListener("click", async () => {
    await playAboutVideo();
    aboutVideo.focus();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      videoIsVisible = entries[0].isIntersecting;
      syncAboutVideo();
    }).observe(aboutVideo);
  } else {
    syncAboutVideo();
  }
  reducedMotion.addEventListener("change", syncAboutVideo);
  connection?.addEventListener("change", syncAboutVideo);
  document.addEventListener("visibilitychange", syncAboutVideo);
}

function getGalleryScrollOffset() {
  const headerHeight = document.querySelector(".top-bar")?.offsetHeight || 0;
  const navHeight = document.querySelector(".gallery-nav")?.offsetHeight || 0;
  return headerHeight + navHeight + 16;
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href") || "";
    if (href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY
            - (anchor.classList.contains("gallery-nav-link") ? getGalleryScrollOffset() : 70),
          behavior: "smooth",
        });
      }
    }
  });
});

// Sticky navigation scroll effect
const topBar = document.querySelector(".top-bar");

if (topBar) window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    topBar.classList.add("scrolled");
  } else {
    topBar.classList.remove("scrolled");
  }
});

// Mobile Menu Toggle
const mobileMenu = document.getElementById("mobile-menu");
const mainNav = document.querySelector(".main-nav");

if (mobileMenu && mainNav) {
  mainNav.classList.add("enhanced");
  const setMenuOpen = (open) => {
    mainNav.classList.toggle("active", open);
    mobileMenu.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };

  mobileMenu.addEventListener("click", () => {
    setMenuOpen(!mainNav.classList.contains("active"));
  });

  // Close menu when clicking a link
  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mainNav.classList.contains("active")) {
      setMenuOpen(false);
      mobileMenu.focus();
    }
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

// Keep floating support controls clear while the main booking/browsing actions are visible.
const journeyActions = document.querySelectorAll(".gallery-booking-cta, .hero-buttons a");
if (journeyActions.length > 0 && "IntersectionObserver" in window) {
  const visibleActions = new Set();
  const journeyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleActions.add(entry.target);
      else visibleActions.delete(entry.target);
    });
    document.body.classList.toggle("journey-actions-visible", visibleActions.size > 0);
  });
  journeyActions.forEach((action) => journeyObserver.observe(action));
}

// Enhanced Gallery Lightbox Functionality
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("img01");
const captionText = document.getElementById("caption");
const closeBtn = document.querySelector(".close-modal");
const prevBtnLightbox = document.querySelector(".lightbox-nav.prev");
const nextBtnLightbox = document.querySelector(".lightbox-nav.next");
const galleryImages = Array.from(document.querySelectorAll(".gallery-card img"));

let currentImageIndex = 0;
let lightboxTrigger = null;
let lightboxRequest = 0;

async function loadLightboxImage(img) {
  const request = ++lightboxRequest;
  const next = new Image();
  next.decoding = "async";
  next.src = img.dataset.full || img.currentSrc || img.src;
  try { await next.decode(); } catch {
    next.src = img.dataset.fallback || img.src;
    try { await next.decode(); } catch { return; }
  }
  if (request !== lightboxRequest) return;
  modalImg.width = next.naturalWidth;
  modalImg.height = next.naturalHeight;
  modalImg.src = next.src;
  modalImg.alt = img.alt || "Gallery Image";
  if (captionText) captionText.textContent = img.alt || "";
}

function openLightbox(index) {
  if (!modal) return;
  currentImageIndex = index;
  const img = galleryImages[index];
  lightboxTrigger = document.activeElement;

  modal.inert = false;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  closeBtn?.focus();
  if (img) {
    // Show the already-loaded thumbnail while the larger photograph decodes.
    modalImg.src = img.currentSrc || img.src;
    modalImg.width = img.width;
    modalImg.height = img.height;
    modalImg.alt = img.alt || "Gallery Image";
    if (captionText) captionText.textContent = img.alt || "";
    loadLightboxImage(img);
  }
  document.body.style.overflow = "hidden"; // Prevent scrolling
}

function closeLightbox() {
  if (!modal) return;
  lightboxRequest++;
  modal.style.display = "none";
  modal.inert = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto"; // Restore scrolling
  modalImg.style.opacity = "";
  lightboxTrigger?.focus({ preventScroll: true });
}

function changeImage(step) {
  if (galleryImages.length === 0) return;
  currentImageIndex = (currentImageIndex + step + galleryImages.length) % galleryImages.length;
  const img = galleryImages[currentImageIndex];

  loadLightboxImage(img);
}

// Read cards from static HTML; no independent photo configuration in the browser.
document.querySelectorAll('.gallery-card').forEach((card, index) => {
  // With scripting, each image link becomes a keyboard-operable dialog trigger.
  card.setAttribute('role', 'button');
  card.setAttribute('aria-haspopup', 'dialog');
  card.addEventListener('keydown', event => {
    if (event.key === ' ') { event.preventDefault(); openLightbox(index); }
  });
  card.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openLightbox(index);
  });
});

if (modal) {
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
      if (e.key === "Tab") {
        const controls = Array.from(modal.querySelectorAll("button"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") changeImage(-1);
      if (e.key === "ArrowRight") changeImage(1);
    }
  });
}


// Contact Form Feedback
const contactForm = document.querySelector(".contact-form");

if (contactForm) {
  const checkInInput = contactForm.querySelector("#checkIn");
  const checkOutInput = contactForm.querySelector("#checkOut");
  const consentInput = contactForm.querySelector("#privacyConsent");
  const consentError = contactForm.querySelector("#consent-error");
  const today = new Date();
  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const updateCheckoutDate = () => {
    if (!checkInInput || !checkOutInput) return;

    checkOutInput.min = checkInInput.value || todayDate;

    if (checkOutInput.value && checkOutInput.value < checkOutInput.min) {
      checkOutInput.value = "";
    }
  };

  if (checkInInput && checkOutInput) {
    checkInInput.min = todayDate;
    checkOutInput.min = todayDate;

    if (checkInInput.value && checkInInput.value < todayDate) {
      checkInInput.value = "";
    }

    checkInInput.addEventListener("change", updateCheckoutDate);
    updateCheckoutDate();
  }

  if (consentInput && consentError) {
    consentInput.addEventListener("invalid", () => {
      consentInput.setAttribute("aria-invalid", "true");
      consentError.hidden = false;
    });

    consentInput.addEventListener("change", () => {
      if (consentInput.checked) {
        consentInput.removeAttribute("aria-invalid");
        consentError.hidden = true;
      }
    });
  }

  contactForm.addEventListener("reset", () => {
    if (consentInput) {
      consentInput.removeAttribute("aria-invalid");
    }
    if (consentError) {
      consentError.hidden = true;
    }
  });

  // AJAX is only allowed on the form receiver origin. A downloaded Afrihost copy
  // must use the embedded receiver or open its public link. No cross-origin fetch.
  const submissionEnabled = contactForm.dataset.submissionEnabled === "true" &&
    new URL(contactForm.action).origin === window.location.origin;
  const submitButton = contactForm.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = !submissionEnabled;
  let submitting = false;

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    const successMsg = document.getElementById("form-success");
    const errorMsg = document.getElementById("form-error");
    if (successMsg) successMsg.style.display = "none";
    if (errorMsg) errorMsg.style.display = "none";
    if (!submissionEnabled) {
      if (errorMsg) {
        errorMsg.textContent = "Please open the Netlify enquiry form using the website contact section. This local copy cannot accept submissions.";
        errorMsg.style.display = "block";
      }
      return;
    }

    for (const input of contactForm.querySelectorAll("input[required]:not([type='checkbox'])")) {
      input.value = input.value.trim();
    }
    if (consentInput && !consentInput.checked) {
      consentInput.setAttribute("aria-invalid", "true");
      if (consentError) consentError.hidden = false;
    }
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    if (contactForm.elements.namedItem("bot-field")?.value) {
      if (errorMsg) {
        errorMsg.textContent = "The enquiry could not be submitted. Please contact us directly.";
        errorMsg.style.display = "block";
      }
      return;
    }

    const originalText = submitButton ? submitButton.textContent : "Send Message";
    submitting = true;
    contactForm.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.textContent = "Sending...";
      submitButton.disabled = true;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const formData = new FormData(contactForm);
      // Netlify serves this document and receives its URL-encoded POST.
      // HTTP acceptance is not evidence of notification delivery or a booking.
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString(),
        credentials: "omit",
        mode: "same-origin",
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok || response.type === "opaque" || response.redirected) {
        throw new Error("Submission acceptance was not confirmed");
      }
      contactForm.reset();
      updateCheckoutDate();
      if (successMsg) successMsg.style.display = "block";
    } catch {
      if (errorMsg) {
        errorMsg.textContent = "We could not confirm acceptance of your enquiry. Please contact us directly before retrying to avoid duplicates.";
        errorMsg.style.display = "block";
      }
      // Do not log submitted personal information or automatically retry a POST.
    } finally {
      clearTimeout(timeout);
      submitting = false;
      contactForm.removeAttribute("aria-busy");
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    }
  });
}

// Gallery ScrollSpy and Sticky Nav Logic
const gallerySections = document.querySelectorAll(".gallery-section");
const galleryNavLinks = document.querySelectorAll(".gallery-nav-link");
const galleryNavInner = document.querySelector(".gallery-nav-inner");

if (gallerySections.length > 0 && galleryNavLinks.length > 0) {
  let activeSectionId = "";
  const updateGalleryNavigation = () => {
    let current = gallerySections[0].id;
    const offset = getGalleryScrollOffset();

    gallerySections.forEach((section) => {
      if (section.getBoundingClientRect().top <= offset + 1) current = section.id;
    });

    if (current === activeSectionId) return;
    activeSectionId = current;

    galleryNavLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");

      // Scroll only the horizontal collection strip, never the page itself.
      if (active && galleryNavInner && window.innerWidth <= 900) {
        const left = galleryNavInner.scrollLeft + link.getBoundingClientRect().left
          - galleryNavInner.getBoundingClientRect().left
          - (galleryNavInner.clientWidth - link.offsetWidth) / 2;
        galleryNavInner.scrollTo({ left, behavior: "smooth" });
      }
    });
  };

  window.addEventListener("scroll", updateGalleryNavigation, { passive: true });
  window.addEventListener("resize", () => {
    activeSectionId = "";
    updateGalleryNavigation();
  });
  updateGalleryNavigation();
}

// Gallery "Show More" Functionality
document.addEventListener("DOMContentLoaded", () => {
  const gallerySections = document.querySelectorAll(".gallery-section");
  const MAX_VISIBLE_IMAGES = 6; // Set limit for initial view

  gallerySections.forEach((section) => {
    const masonry = section.querySelector(".gallery-masonry");
    if (!masonry) return;

    const cards = Array.from(masonry.querySelectorAll(".gallery-card"));

    if (cards.length > MAX_VISIBLE_IMAGES) {
      // Hide extra cards
      cards.slice(MAX_VISIBLE_IMAGES).forEach(card => card.classList.add("hidden"));

      // Create Button
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-show-more-btn";
      btn.setAttribute("aria-controls", masonry.id);
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = `View All Photos (${cards.length}) <i class="fas fa-chevron-down" aria-hidden="true"></i>`;

      // Toggle Logic
      btn.addEventListener("click", () => {
        const isExpanded = btn.classList.contains("expanded");
        btn.setAttribute("aria-expanded", String(!isExpanded));

        if (isExpanded) {
          // Collapse
          cards.slice(MAX_VISIBLE_IMAGES).forEach(card => card.classList.add("hidden"));
          btn.classList.remove("expanded");
          btn.innerHTML = `View All Photos (${cards.length}) <i class="fas fa-chevron-down" aria-hidden="true"></i>`;

          // Scroll back to top of section gently
          window.scrollTo({
            top: section.getBoundingClientRect().top + window.scrollY - getGalleryScrollOffset(),
            behavior: "smooth",
          });
        } else {
          // Expand
          cards.forEach(card => card.classList.remove("hidden"));
          btn.classList.add("expanded");
          btn.innerHTML = `Show Less <i class="fas fa-chevron-down" aria-hidden="true"></i>`;
        }
      });

      section.appendChild(btn);
    }
  });
});

// Resize the embedded receiver without exchanging any enquiry fields.
const enquiryFrame = document.getElementById('enquiry-frame');
if (enquiryFrame) {
  const receiverOrigin = new URL(enquiryFrame.src).origin;
  window.addEventListener('message', event => {
    if (event.origin !== receiverOrigin || event.source !== enquiryFrame.contentWindow) return;
    if (event.data?.type !== 'ematolweni:enquiry-height' || !Number.isFinite(event.data.height)) return;
    enquiryFrame.style.height = Math.min(2400, Math.max(500, Math.ceil(event.data.height))) + 'px';
  });
}
const enquiryShell = document.querySelector('.enquiry-shell');
if (enquiryShell && window.parent !== window) {
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch { /* Fixed-height fallback remains usable. */ }
  const allowedParents = ['https://ematolweniguesthouse.co.za', 'https://www.ematolweniguesthouse.co.za', 'https://ematolweni-guesthouse.netlify.app'];
  if (allowedParents.includes(parentOrigin)) {
    const reportSize = () => window.parent.postMessage({type:'ematolweni:enquiry-height', height:enquiryShell.scrollHeight + 16}, parentOrigin);
    new ResizeObserver(reportSize).observe(enquiryShell);
    window.addEventListener('load', reportSize);
  }
}
