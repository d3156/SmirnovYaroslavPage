(function () {
  const stage = document.querySelector(".stage");
  const leafBack = stage.querySelector(".leaf-back");
  const foldShade = stage.querySelector(".fold-shade");
  const scan = stage.querySelector(".scan");
  const faces = { eng: stage.querySelector(".face.eng"), lyr: stage.querySelector(".face.lyr") };
  const titles = { eng: document.title, lyr: "Ярослав Смирнов — рассказы" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KNOB_MS = 180, TURN_MS = 1150, GLITCH_MS = 800;
  let busy = false;

  function setFace(name) {
    stage.dataset.face = name;
    for (const [key, face] of Object.entries(faces)) {
      face.inert = key !== name;
      face.setAttribute("aria-hidden", String(key !== name));
    }
    document.title = titles[name];
  }

  // К писателю: лист перелистывается справа налево — загиб с бумажным оборотом уходит влево,
  // за ним открывается новая страница. f — где загиб пересекает середину экрана, низ листа идёт первым.
  function pageTurn(from, to) {
    faces[to].classList.add("is-in");
    faces[from].classList.add("is-out", "is-turning");
    leafBack.classList.add("on");
    foldShade.classList.add("on");
    const W = innerWidth, H = innerHeight, a = W * .12;
    const at = f => ({
      page: `polygon(0px 0px, ${f + a}px 0px, ${f - a}px ${H}px, 0px ${H}px)`,
      back: `polygon(${2 * (f + a) - W}px 0px, ${f + a}px 0px, ${f - a}px ${H}px, ${2 * (f - a) - W}px ${H}px)`,
      backPosition: `${f - W}px 0px`,
      shade: `translateX(${f}px) rotate(${Math.atan(2 * a / H)}rad)`,
    });
    const start = at(W + a), end = at(-a);
    const timing = { duration: TURN_MS, delay: KNOB_MS, easing: "cubic-bezier(.45,.05,.35,1)", fill: "both" };
    return [
      faces[from].animate({ clipPath: [start.page, end.page] }, timing),
      leafBack.animate({ clipPath: [start.back, end.back], backgroundPosition: [start.backPosition, end.backPosition] }, timing),
      foldShade.animate({ transform: [start.shade, end.shade] }, timing),
      faces[to].animate({ filter: ["brightness(.6)", "brightness(1)"] }, timing),
    ];
  }

  // К инженеру: глитч — новая страница пробивается полосами со сдвигом и цветным расслоением.
  function glitch(from, to) {
    faces[to].classList.add("is-in");
    faces[from].classList.add("is-out");
    scan.classList.add("on");
    const rnd = (a, b) => a + Math.random() * (b - a);
    const split = px => `${px}px 0 rgba(255, 0, 90, .85), ${-px}px 0 rgba(0, 230, 255, .85)`;
    const steps = 18, incoming = [], outgoing = [], lines = [];
    for (let i = 0; i < steps; i++) {
      const offset = i / steps, settled = offset > .7;
      const top = rnd(0, 90), height = rnd(3, 12 + offset * 60);
      const shown = settled || Math.random() < .3 + offset;
      incoming.push({
        offset, easing: "steps(1, end)",
        clipPath: settled ? "inset(0 0 0 0)" : shown ? `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)` : "inset(0 0 100% 0)",
        transform: `translateX(${settled ? rnd(-3, 3) : rnd(-28, 28)}px)`,
        textShadow: split(settled ? rnd(.5, 2) : rnd(2, 6)),
      });
      outgoing.push({
        offset, easing: "steps(1, end)",
        transform: `translate(${rnd(-10, 10)}px, ${rnd(-3, 3)}px)`,
        filter: `hue-rotate(${rnd(-70, 70)}deg) saturate(${rnd(1, 2.2)}) contrast(${rnd(1, 1.5)})`,
        textShadow: split(rnd(1, 5)),
      });
      lines.push({ offset, easing: "steps(1, end)", opacity: rnd(.25, .8) * (1 - offset * .6) });
    }
    incoming.push({ offset: 1, clipPath: "inset(0 0 0 0)", transform: "translateX(0px)", textShadow: split(0) });
    outgoing.push({ offset: 1, transform: "translate(0px, 0px)", filter: "hue-rotate(0deg) saturate(1) contrast(1)", textShadow: split(0) });
    lines.push({ offset: 1, opacity: 0 });
    const timing = { duration: GLITCH_MS, delay: KNOB_MS, fill: "both" };
    return [faces[to].animate(incoming, timing), faces[from].animate(outgoing, timing), scan.animate(lines, timing)];
  }

  function fade(from, to) {
    faces[to].classList.add("is-in");
    faces[from].classList.add("is-out");
    return [faces[to].animate({ opacity: [0, 1] }, { duration: 200, fill: "both" })];
  }

  function go(to, button) {
    const from = stage.dataset.face;
    if (busy || to === from) return;
    busy = true;
    history.replaceState(null, "", location.pathname + location.search + (to === "lyr" ? "#proza" : ""));
    button.classList.add("go");
    const animations = reduceMotion ? fade(from, to) : to === "lyr" ? pageTurn(from, to) : glitch(from, to);
    Promise.all(animations.map(a => a.finished)).then(() => {
      setFace(to);
      faces[to].classList.remove("is-in");
      faces[from].classList.remove("is-out", "is-turning");
      leafBack.classList.remove("on");
      foldShade.classList.remove("on");
      scan.classList.remove("on");
      animations.forEach(a => a.cancel());
      button.classList.remove("go");
      busy = false;
    });
  }

  document.querySelectorAll(".switch").forEach(button =>
    button.addEventListener("click", () => go(button.dataset.to, button)));

  const target = location.hash && document.getElementById(location.hash.slice(1));
  setFace(target && faces.lyr.contains(target) ? "lyr" : "eng");
})();
