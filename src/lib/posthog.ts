import posthog from "posthog-js";

posthog.init("phc_4VOZZSzcexOpm4ujueqqjfdVVSX2IIPTinmSgfWMV1J", {
  api_host: "https://us.i.posthog.com",
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: false,
  person_profiles: "identified_only",
  persistence: "localStorage",
  capture_exceptions: true,
  session_recording: {
    maskAllInputs: true,
  },
});

export default posthog;
