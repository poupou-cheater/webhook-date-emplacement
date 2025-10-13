document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('display');
  const calculator = document.querySelector('.calculator');

  if (!display || !calculator) return;

  calculator.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      display.value = '3';
    }
  });
});