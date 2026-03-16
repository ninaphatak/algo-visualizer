/* ============================================
   CS 141 Algorithm Visualizer — Playback Controls
   ============================================ */

window.AlgoVis = window.AlgoVis || {};

AlgoVis.createPlayer = function (events, onEvent) {
  let currentIndex = 0;
  let intervalId = null;
  let playing = false;

  const stepBtn   = document.getElementById('stepBtn');
  const backBtn   = document.getElementById('backBtn');
  const autoBtn   = document.getElementById('autoBtn');
  const resetBtn  = document.getElementById('resetBtn');
  const slider    = document.getElementById('speedSlider');
  const speedLabel = document.getElementById('speedLabel');

  function getDelay() {
    const val = slider ? parseInt(slider.value, 10) : 500;
    return 1100 - val; // higher slider value = faster
  }

  function updateUI() {
    if (backBtn)  backBtn.disabled  = currentIndex <= 0;
    if (stepBtn)  stepBtn.disabled  = currentIndex >= events.length - 1;
    if (autoBtn)  autoBtn.textContent = playing ? 'Pause' : 'Play';
    if (resetBtn) resetBtn.disabled = currentIndex === 0 && !playing;
  }

  function fireEvent() {
    onEvent(events[currentIndex], currentIndex);
    updateUI();
  }

  function step() {
    if (currentIndex < events.length - 1) {
      currentIndex++;
      fireEvent();
    } else if (playing) {
      pause();
    }
  }

  function back() {
    if (currentIndex > 0) {
      currentIndex--;
      fireEvent();
    }
  }

  function play() {
    if (playing) return;
    playing = true;
    updateUI();
    intervalId = setInterval(function () {
      if (currentIndex < events.length - 1) {
        currentIndex++;
        fireEvent();
      } else {
        pause();
      }
    }, getDelay());
  }

  function pause() {
    playing = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    updateUI();
  }

  function reset() {
    pause();
    currentIndex = 0;
    fireEvent();
  }

  function jumpTo(i) {
    if (i < 0 || i >= events.length) return;
    currentIndex = i;
    fireEvent();
  }

  // Bind DOM buttons
  if (stepBtn)  stepBtn.addEventListener('click', step);
  if (backBtn)  backBtn.addEventListener('click', back);
  if (autoBtn)  autoBtn.addEventListener('click', function () {
    playing ? pause() : play();
  });
  if (resetBtn) resetBtn.addEventListener('click', reset);

  // Speed slider
  if (slider) {
    if (speedLabel) speedLabel.textContent = slider.value + 'ms';
    slider.addEventListener('input', function () {
      if (speedLabel) speedLabel.textContent = slider.value + 'ms';
      if (playing) {
        clearInterval(intervalId);
        intervalId = setInterval(function () {
          if (currentIndex < events.length - 1) {
            currentIndex++;
            fireEvent();
          } else {
            pause();
          }
        }, getDelay());
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        step();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        back();
        break;
      case 'r':
        reset();
        break;
      case 'p':
        playing ? pause() : play();
        break;
    }
  });

  // Initial render
  fireEvent();

  return { step: step, back: back, play: play, pause: pause, reset: reset, jumpTo: jumpTo };
};
