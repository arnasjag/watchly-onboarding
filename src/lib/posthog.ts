import posthog from "posthog-js";

posthog.init("phc_4VOZZSzcexOpm4ujueqqjfdVVSX2IIPTinmSgfWMV1J", {
  api_host: "https://eu.i.posthog.com",
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  person_profiles: "identified_only",
  persistence: "localStorage",
  session_recording: {
    maskAllInputs: true,
  },
});

export default posthog;
