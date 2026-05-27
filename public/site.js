document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });
});

const snapSections = Array.from(
  document.querySelectorAll("main > .section:not(.chatbot-section)")
);
const snapReleaseSection = document.querySelector(".faq-section");
const snapMedia = window.matchMedia(
  "(min-width: 981px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)"
);
let isSnapScrolling = false;
let snapUnlockTimer;
let snapReleaseTicking = false;

function getSnapHeaderOffset() {
  const header = document.querySelector(".site-header");
  return header instanceof HTMLElement ? header.offsetHeight : 72;
}

function findScrollableParent(element) {
  let node = element;

  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll)/.test(style.overflowY);

      if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
    }

    node = node.parentElement;
  }

  return null;
}

function canScrollInside(element, deltaY) {
  if (!element) return false;

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  return element.scrollTop > 1;
}

function getCurrentSnapIndex() {
  const headerOffset = getSnapHeaderOffset();
  const viewportAnchor = headerOffset + (window.innerHeight - headerOffset) / 2;
  let currentIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  snapSections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();

    if (rect.top <= viewportAnchor && rect.bottom >= viewportAnchor) {
      currentIndex = index;
      nearestDistance = 0;
      return;
    }

    const distance = Math.abs(rect.top - headerOffset);
    if (distance < nearestDistance) {
      currentIndex = index;
      nearestDistance = distance;
    }
  });

  return currentIndex;
}

function scrollToSnapSection(index) {
  const section = snapSections[index];
  if (!section) return;

  const top = window.scrollY + section.getBoundingClientRect().top - getSnapHeaderOffset();
  window.scrollTo({ top, behavior: "smooth" });
}

function shouldReleaseSnap() {
  if (!snapMedia.matches || !(snapReleaseSection instanceof HTMLElement)) return false;

  const releaseTop = window.scrollY + snapReleaseSection.getBoundingClientRect().top - getSnapHeaderOffset();
  return window.scrollY >= releaseTop - 2;
}

function updateSnapRelease() {
  document.documentElement.classList.toggle("snap-scroll-released", shouldReleaseSnap());
}

function scheduleSnapReleaseUpdate() {
  if (snapReleaseTicking) return;

  snapReleaseTicking = true;
  window.requestAnimationFrame(() => {
    updateSnapRelease();
    snapReleaseTicking = false;
  });
}

window.addEventListener(
  "wheel",
  (event) => {
    if (!snapMedia.matches || snapSections.length < 2) return;
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".chatbot-widget")) return;
    if (event.target.closest(".chatbot-section, .site-footer")) return;

    const scrollableParent = findScrollableParent(event.target);
    if (canScrollInside(scrollableParent, event.deltaY)) return;

    const direction = Math.sign(event.deltaY);
    if (!direction) return;

    if (isSnapScrolling) {
      event.preventDefault();
      return;
    }

    const currentIndex = getCurrentSnapIndex();
    const nextIndex = Math.max(0, Math.min(snapSections.length - 1, currentIndex + direction));
    if (nextIndex === currentIndex) {
      if (direction > 0 && currentIndex === snapSections.length - 1) {
        document.documentElement.classList.add("snap-scroll-released");
      }

      return;
    }

    event.preventDefault();

    isSnapScrolling = true;
    scrollToSnapSection(nextIndex);

    window.clearTimeout(snapUnlockTimer);
    snapUnlockTimer = window.setTimeout(() => {
      isSnapScrolling = false;
      updateSnapRelease();
    }, 850);
  },
  { passive: false }
);

window.addEventListener("scroll", scheduleSnapReleaseUpdate, { passive: true });

window.addEventListener("resize", () => {
  isSnapScrolling = false;
  window.clearTimeout(snapUnlockTimer);
  updateSnapRelease();
});

const chatbotDataElement = document.getElementById("chatbot-data");
const chatbotWidget = document.querySelector("[data-chatbot-widget]");

if (chatbotDataElement && chatbotWidget) {
  const launcher = chatbotWidget.querySelector("[data-chatbot-toggle]");
  const panel = chatbotWidget.querySelector("#chatbot-panel");
  const closeButton = chatbotWidget.querySelector("[data-chatbot-close]");
  const messages = chatbotWidget.querySelector("[data-chatbot-messages]");
  const form = chatbotWidget.querySelector("[data-chatbot-form]");
  const input = form?.querySelector("input");
  const quickButtons = chatbotWidget.querySelectorAll("[data-chatbot-query]");
  let hasWelcomed = false;
  let chatbotData = {};

  try {
    chatbotData = JSON.parse(chatbotDataElement.textContent || "{}");
  } catch {
    chatbotData = {};
  }

  function openChatbot() {
    if (!panel || !launcher) return;

    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");

    if (!hasWelcomed) {
      appendMessage(
        "bot",
        "안녕하세요. 신청 방법, 일정, 장소, 참가비를 물어보면 바로 안내해드릴게요."
      );
      hasWelcomed = true;
    }

    window.requestAnimationFrame(() => input?.focus());
  }

  function closeChatbot() {
    if (!panel || !launcher) return;

    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
  }

  function appendMessage(role, text, actions = []) {
    if (!messages) return;

    const bubble = document.createElement("div");
    bubble.className = `chatbot-message chatbot-message-${role}`;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    bubble.append(paragraph);

    if (actions.length) {
      const actionList = document.createElement("div");
      actionList.className = "chatbot-message-actions";

      actions.forEach((action) => {
        if (!action.href) return;

        const link = document.createElement("a");
        link.href = action.href;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = action.label;
        actionList.append(link);
      });

      if (actionList.children.length) {
        bubble.append(actionList);
      }
    }

    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function tokenize(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/gu)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);
  }

  function getEvent() {
    return chatbotData.event || {};
  }

  function formatList(items, fallback) {
    return Array.isArray(items) && items.length ? items.join(", ") : fallback;
  }

  function findFaqAnswer(query) {
    const faq = Array.isArray(chatbotData.faq) ? chatbotData.faq : [];
    const queryTokens = tokenize(query);
    const normalizedQuery = normalizeText(query);
    let bestMatch = null;
    let bestScore = 0;

    faq.forEach((item) => {
      const question = item?.question || "";
      const answer = item?.answer || "";
      const searchable = normalizeText(`${question} ${answer}`);
      const score = queryTokens.reduce((total, token) => total + (searchable.includes(token) ? 1 : 0), 0);

      if (normalizedQuery && searchable.includes(normalizedQuery)) {
        bestMatch = item;
        bestScore = Math.max(bestScore, score + 3);
        return;
      }

      if (score > bestScore) {
        bestMatch = item;
        bestScore = score;
      }
    });

    return bestScore > 0 ? bestMatch : null;
  }

  function buildAnswer(query) {
    const normalized = normalizeText(query);
    const event = getEvent();

    if (includesAny(normalized, ["신청", "지원", "구글폼", "폼", "접수"])) {
      return {
        text: chatbotData.applyUrl
          ? `신청은 홈페이지의 ${chatbotData.applyLabel || "신청하기"} 버튼 또는 구글폼에서 진행합니다. 제출 후 성비와 나이대를 조율해 선정자에게 개별 안내합니다.`
          : "현재 공개 신청 링크가 열려 있지 않습니다. 신청 오픈 시 홈페이지 버튼이 활성화됩니다.",
        actions: chatbotData.applyUrl ? [{ label: chatbotData.applyLabel || "신청하기", href: chatbotData.applyUrl }] : []
      };
    }

    if (includesAny(normalized, ["일정", "날짜", "시간", "언제", "회차"])) {
      return {
        text: event.eventDate
          ? `${event.generationLabel || "현재 기수"} 일정은 ${event.eventDate}입니다. 시간은 ${formatList(event.timeSlots, "확정자에게 개별 안내")} 기준으로 운영됩니다.`
          : "현재 공개된 일정이 없습니다. 일정이 열리면 홈페이지 Current Event 영역에 표시됩니다."
      };
    }

    if (includesAny(normalized, ["장소", "위치", "어디", "지역", "강남", "논현"])) {
      return {
        text: event.region
          ? `장소는 ${event.region} 기준이며, 상세 위치는 ${event.venueNote || "참여 확정자에게 개별 안내"} 방식으로 안내합니다.`
          : "장소 정보는 일정이 공개되면 홈페이지에 함께 표시됩니다."
      };
    }

    if (includesAny(normalized, ["참가비", "가격", "비용", "결제", "입금", "환불"])) {
      return {
        text: event.priceRows
          ? `참가비는 ${formatList(event.priceRows, "확정자에게 개별 안내")}입니다. 참여 확정되신 분들께 별도로 결제 안내드립니다.`
          : "참가비와 결제 안내는 참여 확정되신 분들께 별도로 안내드립니다."
      };
    }

    if (includesAny(normalized, ["인스타", "instagram", "릴스", "소식"])) {
      return {
        text: "모임 분위기와 다음 모집 소식은 Instagram에서도 확인할 수 있습니다.",
        actions: chatbotData.instagramUrl ? [{ label: "Instagram 보기", href: chatbotData.instagramUrl }] : []
      };
    }

    const faqAnswer = findFaqAnswer(query);
    if (faqAnswer) {
      return { text: faqAnswer.answer };
    }

    return {
      text: "지금은 FAQ와 현재 행사 정보를 기준으로 답변하고 있습니다. 신청 방법, 일정, 장소, 참가비처럼 물어봐 주세요."
    };
  }

  function handleQuery(query) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    openChatbot();
    appendMessage("user", trimmedQuery);

    const answer = buildAnswer(trimmedQuery);
    window.setTimeout(() => {
      appendMessage("bot", answer.text, answer.actions || []);
    }, 180);
  }

  launcher?.addEventListener("click", () => {
    if (!panel) return;

    if (panel.hidden) {
      openChatbot();
    } else {
      closeChatbot();
    }
  });

  closeButton?.addEventListener("click", closeChatbot);

  document.querySelectorAll("[data-chatbot-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openChatbot();
    });
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleQuery(button.dataset.chatbotQuery || button.textContent || "");
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input) return;

    handleQuery(input.value);
    input.value = "";
  });

  if (window.location.hash === "#chatbot") {
    openChatbot();
  }
}
