let mins = 0;
let started = false;
let customSound = null;
let blinkCounter = 0;
let lastBlink = 0;

const hello = document.getElementById("hello");
const session = document.getElementById("session");
const next = document.getElementById("next");

function scrollToSetup() {
    document.getElementById("setup").scrollIntoView({
        behavior: "smooth"
    });
}

function saveProfile() {
    localStorage.setItem("eye_name", document.getElementById("name").value);
    localStorage.setItem("eye_age", document.getElementById("age").value);
}

function loadProfile() {
    const nm = localStorage.getItem("eye_name");
    if (nm) {
        hello.textContent = "Selamat datang kembali, " + nm;
    }
}

async function askPermission() {
    if ("Notification" in window) {
        await Notification.requestPermission();
    }
}

function notify(msg) {
    if (Notification.permission === "granted") {
        new Notification("EyeCare", {
            body: msg
        });
    }
}

function beep() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880;
    osc.start();

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 1
    );

    osc.stop(ctx.currentTime + 1);
}

function playAlert() {
    if (customSound) {
        new Audio(customSound).play();
    } else {
        beep();
    }
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();

    const female =
        voices.find(v =>
            /female|zira|samantha|google/i.test(v.name)
        ) || voices[0];

    msg.voice = female;
    msg.rate = 1;
    msg.pitch = 1.15;

    speechSynthesis.speak(msg);
}

function getMode() {
    return document.getElementById("mode").value;
}

function smartInterval() {
    const mode = getMode();

    if (mode === "gaming") return 15;
    if (mode === "editing") return 18;
    if (mode === "senior") return 15;

    return 20;
}

function personalizedBreak() {
    const name =
        localStorage.getItem("eye_name") || "Teman";

    const msg =
        name +
        ", Anda sudah " +
        mins +
        " menit menatap layar. Saatnya lihat jauh 20 detik, kedip 10 kali, dan rilekskan bahu.";

    playAlert();
    speak(msg);
    notify(msg);

    document.body.classList.add("break-mode");

    setTimeout(() => {
        document.body.classList.remove("break-mode");
    }, 20000);
}

function startTimer() {
    setInterval(() => {
        if (!started) return;

        mins++;

        const iv = smartInterval();

        session.textContent = mins + " menit";

        let remain = iv - (mins % iv);
        if (remain === iv) remain = 0;

        next.textContent =
            "Break berikutnya: " +
            remain +
            " menit";

        if (mins % iv === 0) {
            personalizedBreak();
        }
    }, 60000);
}

document
    .getElementById("audioPicker")
    .addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) {
            customSound = URL.createObjectURL(file);
        }
    });

document
    .getElementById("startBtn")
    .addEventListener("click", async () => {
        await askPermission();

        saveProfile();

        const name =
            localStorage.getItem("eye_name") || "User";

        hello.textContent =
            "Halo " + name + ", terapi aktif.";

        started = true;

        speak(
            "Selamat datang " +
            name +
            ". EyeCare siap membantu mata Anda."
        );
    });

document
    .getElementById("testSound")
    .addEventListener("click", playAlert);

document
    .getElementById("darkToggle")
    .addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });

document
    .getElementById("upgradeBtn")
    .addEventListener("click", () => {
        window.open(
            "https://silverhawk.web.id",
            "_blank"
        );
    });

document
    .getElementById("shareBtn")
    .addEventListener("click", async () => {
        const data = {
            title: "EyeCare",
            text:
                "Coba EyeCare gratis untuk terapi mata",
            url: location.href
        };

        if (navigator.share) {
            await navigator.share(data);
        } else {
            navigator.clipboard.writeText(
                location.href
            );
            alert("Link disalin");
        }
    });

function drawChart() {
    const c = document.getElementById("weekChart");
    const x = c.getContext("2d");

    const vals = [22, 35, 18, 40, 28, 32, 25];

    x.clearRect(0, 0, c.width, c.height);

    vals.forEach((v, i) => {
        x.fillStyle = "#0ea5e9";
        x.fillRect(i * 42 + 10, 140 - v, 26, v);
    });
}

function eyeDist(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function EAR(
    p1,
    p2,
    p3,
    p4,
    p5,
    p6
) {
    const A = eyeDist(p2, p6);
    const B = eyeDist(p3, p5);
    const C = eyeDist(p1, p4);

    return (A + B) / (2 * C);
}

async function startCam() {
    const video =
        document.getElementById("cam");

    const faceMesh = new FaceMesh({
        locateFile: file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(results => {
        if (
            !results.multiFaceLandmarks ||
            !results.multiFaceLandmarks[0]
        )
            return;

        const lm =
            results.multiFaceLandmarks[0];

        const left = EAR(
            lm[33],
            lm[160],
            lm[158],
            lm[133],
            lm[153],
            lm[144]
        );

        const right = EAR(
            lm[362],
            lm[385],
            lm[387],
            lm[263],
            lm[373],
            lm[380]
        );

        const ear =
            (left + right) / 2;

        if (
            ear < 0.21 &&
            Date.now() - lastBlink > 300
        ) {
            blinkCounter++;
            lastBlink = Date.now();
        }

        document.getElementById(
            "blinkStatus"
        ).textContent =
            "Kedip terdeteksi: " +
            blinkCounter;

        const nose = lm[1];
        const chin = lm[152];

        const ok =
            chin.y - nose.y > 0.12;

        document.getElementById(
            "postureStatus"
        ).innerHTML =
            'Postur: <span class="' +
            (ok ? "ok" : "warn") +
            '">' +
            (ok
                ? "Baik"
                : "Terlalu Menunduk") +
            "</span>";
    });

    const cam = new Camera(video, {
        onFrame: async () => {
            await faceMesh.send({
                image: video
            });
        },
        width: 640,
        height: 480
    });

    cam.start();
}

document
    .getElementById("camBtn")
    .addEventListener("click", startCam);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
        "sw.js"
    );
}

window.addEventListener("load", () => {
    loadProfile();
    drawChart();
    startTimer();
});

/* ========= EyeCare Shield ========= */

// 1. Domain Lock
const allowedHosts = [
    "eyecare.silverhawk.web.id",
    "localhost",
    "127.0.0.1"
];

if (!allowedHosts.includes(location.hostname)) {
    document.body.innerHTML = `
    <div style="
      padding:40px;
      font-family:Arial;
      text-align:center">
      <h1>Unauthorized Domain</h1>
      <p>EyeCare hanya berjalan di domain resmi.</p>
    </div>
  `;
    throw new Error("Domain blocked");
}

// 6. Random heartbeat
setInterval(() => {
    localStorage.setItem("eyecare_ping", Date.now());
}, 5000);
