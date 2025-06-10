(function () {
  console.debug("dyad-shim.js loaded via proxy v0.6.0");
  const isInsideIframe = window.parent !== window;
  if (!isInsideIframe) return;

  let previousUrl = window.location.href;
  const PARENT_TARGET_ORIGIN = "*";

  // --- History API Overrides ---
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const handleStateChangeAndNotify = (originalMethod, state, title, url) => {
    const oldUrlForMessage = previousUrl;
    let newUrl;
    try {
      newUrl = url
        ? new URL(url, window.location.href).href
        : window.location.href;
    } catch (e) {
      console.error("Could not parse URL", e);
      newUrl = window.location.href;
    }

    const navigationType =
      originalMethod === originalPushState ? "pushState" : "replaceState";

    try {
      // Pass the original state directly
      originalMethod.call(history, state, title, url);
      previousUrl = window.location.href;
      window.parent.postMessage(
        {
          type: navigationType,
          payload: { oldUrl: oldUrlForMessage, newUrl: newUrl },
        },
        PARENT_TARGET_ORIGIN,
      );
    } catch (e) {
      console.error(
        `[vite-dev-plugin] Error calling original ${navigationType}: `,
        e,
      );
      window.parent.postMessage(
        {
          type: "navigation-error",
          payload: {
            operation: navigationType,
            message: e.message,
            error: e.toString(),
            stateAttempted: state,
            urlAttempted: url,
          },
        },
        PARENT_TARGET_ORIGIN,
      );
    }
  };

  history.pushState = function (state, title, url) {
    handleStateChangeAndNotify(originalPushState, state, title, url);
  };

  history.replaceState = function (state, title, url) {
    handleStateChangeAndNotify(originalReplaceState, state, title, url);
  };

  // --- Listener for Back/Forward Navigation (popstate event) ---
  window.addEventListener("popstate", () => {
    const currentUrl = window.location.href;
    previousUrl = currentUrl;
  });

  // --- Listener for Commands from Parent ---
  window.addEventListener("message", (event) => {
    if (
      event.source !== window.parent ||
      !event.data ||
      typeof event.data !== "object"
    )
      return;
    if (event.data.type === "navigate") {
      const direction = event.data.payload?.direction;
      if (direction === "forward") history.forward();
      else if (direction === "backward") history.back();
    }
  });

  // --- Sourcemapped Error Handling ---
  function sendSourcemappedErrorToParent(error, sourceType) {
    if (typeof window.StackTrace === "undefined") {
      console.error("[vite-dev-plugin] StackTrace object not found.");
      // Send simplified raw data if StackTrace isn't available
      window.parent.postMessage(
        {
          type: sourceType,
          payload: {
            message: error?.message || String(error),
            stack:
              error?.stack || "<no stack available - StackTrace.js missing>",
          },
        },
        PARENT_TARGET_ORIGIN,
      );
      return;
    }

    window.StackTrace.fromError(error)
      .then((stackFrames) => {
        const sourcemappedStack = stackFrames
          .map((sf) => sf.toString())
          .join("\n");

        const payload = {
          message: error?.message || String(error),
          stack: sourcemappedStack,
        };

        window.parent.postMessage(
          {
            type: "iframe-sourcemapped-error",
            payload: { ...payload, originalSourceType: sourceType },
          },
          PARENT_TARGET_ORIGIN,
        );
      })
      .catch((mappingError) => {
        console.error(
          "[vite-dev-plugin] Error during stacktrace sourcemapping:",
          mappingError,
        );

        const payload = {
          message: error?.message || String(error),
          // Provide the raw stack or an indication of mapping failure
          stack: error?.stack
            ? `Sourcemapping failed: ${mappingError.message}\n--- Raw Stack ---\n${error.stack}`
            : `Sourcemapping failed: ${mappingError.message}\n<no raw stack available>`,
        };

        window.parent.postMessage(
          {
            type: "iframe-sourcemapped-error",
            payload: { ...payload, originalSourceType: sourceType },
          },
          PARENT_TARGET_ORIGIN,
        );
      });
  }

  window.addEventListener("error", (event) => {
    let error = event.error;
    if (!(error instanceof Error)) {
      window.parent.postMessage(
        {
          type: "window-error",
          payload: {
            message: error.toString(),
            stack: "<no stack available - an improper error was thrown>",
          },
        },
        PARENT_TARGET_ORIGIN,
      );
      return;
    }
    sendSourcemappedErrorToParent(error, "window-error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    let error = event.reason;
    if (!(error instanceof Error)) {
      window.parent.postMessage(
        {
          type: "unhandled-rejection",
          payload: {
            message: event.reason.toString(),
            stack:
              "<no stack available - an improper error was thrown (promise)>",
          },
        },
        PARENT_TARGET_ORIGIN,
      );
      return;
    }
    sendSourcemappedErrorToParent(error, "unhandled-rejection");
  });

  (function watchForViteErrorOverlay() {
    // --- Configuration for the observer ---
    // We only care about direct children being added or removed.
    const config = {
      childList: true, // Observe additions/removals of child nodes
      subtree: false, // IMPORTANT: Do *not* observe descendants, only direct children
    };

    // --- Callback function executed when mutations are observed ---
    const observerCallback = function (mutationsList) {
      // Iterate through all mutations that just occurred
      for (const mutation of mutationsList) {
        // We are only interested in nodes that were added
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check each added node
          for (const node of mutation.addedNodes) {
            // Check if it's an ELEMENT_NODE (type 1) and has the correct ID
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.tagName === "vite-error-overlay".toUpperCase()
            ) {
              reportViteErrorOverlay(node);
            }
          }
        }
      }
    };

    function reportViteErrorOverlay(node) {
      console.log(`Detected vite error overlay: ${node}`);
      try {
        window.parent.postMessage(
          {
            type: "build-error-report",
            payload: {
              message: node.shadowRoot.querySelector(".message").textContent,
              file: node.shadowRoot.querySelector(".file").textContent,
              frame: node.shadowRoot.querySelector(".frame").textContent,
            },
          },
          PARENT_TARGET_ORIGIN,
        );
      } catch (error) {
        console.error("Could not report vite error overlay", error);
      }
    }

    // --- Wait for DOM ready logic ---
    if (document.readyState === "loading") {
      // The document is still loading, wait for DOMContentLoaded
      document.addEventListener("DOMContentLoaded", () => {
        if (!document.body) {
          console.error(
            "document.body does not exist - something very weird happened",
          );
          return;
        }

        const node = document.body.querySelector("vite-error-overlay");
        if (node) {
          reportViteErrorOverlay(node);
        }
        const observer = new MutationObserver(observerCallback);
        observer.observe(document.body, config);
      });
      console.log(
        "Document loading, waiting for DOMContentLoaded to set up observer.",
      );
    } else {
      if (!document.body) {
        console.error(
          "document.body does not exist - something very weird happened",
        );
        return;
      }
      // The DOM is already interactive or complete
      console.log("DOM already ready, setting up observer immediately.");
      const observer = new MutationObserver(observerCallback);
      observer.observe(document.body, config);
    }
  })();
})();

(() => {
  const OVERLAY_ID = "__dyad_overlay__";
  let overlay, label;

  // The possible states are:
  // { type: 'inactive' }
  // { type: 'inspecting', element: ?HTMLElement }
  // { type: 'selected', element: HTMLElement }
  let state = { type: "inactive" };

  /* ---------- helpers --------------------------------------------------- */
  const css = (el, obj) => Object.assign(el.style, obj);

  function makeOverlay() {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    css(overlay, {
      position: "absolute",
      border: "2px solid #7f22fe",
      background: "rgba(0,170,255,.05)",
      pointerEvents: "none",
      zIndex: "2147483647", // max
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    });

    label = document.createElement("div");
    css(label, {
      position: "absolute",
      left: "0",
      top: "100%",
      transform: "translateY(4px)",
      background: "#7f22fe",
      color: "#fff",
      fontFamily: "monospace",
      fontSize: "12px",
      lineHeight: "1.2",
      padding: "3px 5px",
      whiteSpace: "nowrap",
      borderRadius: "4px",
      boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);
  }

  function updateOverlay(el, isSelected = false) {
    if (!overlay) makeOverlay();

    const rect = el.getBoundingClientRect();
    css(overlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
      border: isSelected ? "3px solid #7f22fe" : "2px solid #7f22fe",
      background: isSelected
        ? "rgba(127, 34, 254, 0.05)"
        : "rgba(0,170,255,.05)",
    });

    css(label, {
      background: "#7f22fe",
    });

    // Clear previous contents
    while (label.firstChild) {
      label.removeChild(label.firstChild);
    }

    if (isSelected) {
      const editLine = document.createElement("div");

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "12");
      svg.setAttribute("height", "12");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("fill", "none");
      Object.assign(svg.style, {
        display: "inline-block",
        verticalAlign: "-2px",
        marginRight: "4px",
      });
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute(
        "d",
        "M8 0L9.48528 6.51472L16 8L9.48528 9.48528L8 16L6.51472 9.48528L0 8L6.51472 6.51472L8 0Z",
      );
      path.setAttribute("fill", "white");
      svg.appendChild(path);

      editLine.appendChild(svg);
      editLine.appendChild(document.createTextNode("Edit with AI"));
      label.appendChild(editLine);
    }

    const name = el.dataset.dyadName || "<unknown>";
    const file = (el.dataset.dyadId || "").split(":")[0];

    const nameEl = document.createElement("div");
    nameEl.textContent = name;
    label.appendChild(nameEl);

    if (file) {
      const fileEl = document.createElement("span");
      css(fileEl, { fontSize: "10px", opacity: ".8" });
      fileEl.textContent = file;
      label.appendChild(fileEl);
    }
  }

  /* ---------- event handlers -------------------------------------------- */
  function onMouseMove(e) {
    if (state.type !== "inspecting") return;

    let el = e.target;
    while (el && !el.dataset.dyadId) el = el.parentElement;

    if (state.element === el) return;
    state.element = el;

    if (el) {
      updateOverlay(el, false);
    } else {
      if (overlay) overlay.style.display = "none";
    }
  }

  function onClick(e) {
    if (state.type !== "inspecting" || !state.element) return;
    e.preventDefault();
    e.stopPropagation();

    state = { type: "selected", element: state.element };
    updateOverlay(state.element, true);

    window.parent.postMessage(
      {
        type: "dyad-component-selected",
        id: state.element.dataset.dyadId,
        name: state.element.dataset.dyadName,
      },
      "*",
    );
  }

  /* ---------- activation / deactivation --------------------------------- */
  function activate() {
    if (state.type === "inactive") {
      window.addEventListener("mousemove", onMouseMove, true);
      window.addEventListener("click", onClick, true);
    }
    state = { type: "inspecting", element: null };
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  function deactivate() {
    if (state.type === "inactive") return;

    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("click", onClick, true);
    if (overlay) {
      overlay.remove();
      overlay = null;
      label = null;
    }
    state = { type: "inactive" };
  }

  /* ---------- message bridge -------------------------------------------- */
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    if (e.data.type === "activate-dyad-component-selector") activate();
    if (e.data.type === "deactivate-dyad-component-selector") deactivate();
  });
})();
