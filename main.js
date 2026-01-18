gsap.registerPlugin(ScrollTrigger);

// Scale up "who are you" text as background zooms in (matches background scale)
// Also move it up to track the position on the background image
gsap.to('.hero-text', {
  scale: 2.2,
  y: '-30vh',
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: '+=250%',
    scrub: 0.3,
  }
});

// Fade out "who are you" text as you scroll down
gsap.to('.hero-text', {
  opacity: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: '+=150%',
    scrub: true,
  }
});

// Hero zoom-in effect - single continuous animation
// Fast zoom initially, then continues more slowly
gsap.to('.hero-image', {
  scale: 2.2,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: '+=400%',
    scrub: 0.3,
    pin: false,
  }
});

// Fade in phone section - full screen fade in effect
// Starts later, fades at moderate pace
gsap.to('.phone-section', {
  opacity: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '.scroll-spacer',
    start: 'top 20%',
    end: 'bottom 80%',
    scrub: true,
  }
});

// Fade out hero as phone section scales up
gsap.to('.hero-image', {
  opacity: 0,
  ease: 'none',
  scrollTrigger: {
    trigger: '.scroll-spacer',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  }
});
