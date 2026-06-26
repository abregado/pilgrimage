window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Connect = (() => {
  function render() {}

  function init() {
    document.getElementById('connect-retry-btn').addEventListener('click', () => {
      Pilgrim.Main.autoConnect();
    });
  }

  return { render, init };
})();
