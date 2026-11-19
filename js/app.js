const createBtn = document.querySelector('#createRoom');
const joinForm = document.querySelector('#joinForm');
const roomCodeInput = document.querySelector('#roomCode');
const statusEl = document.querySelector('#status');
const toastEl = document.querySelector('#toast');

let toastTimer;

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 250);
  }, 2200);
}

createBtn.addEventListener('click', () => {
  statusEl.textContent = '未连接服务器 · 房间系统将在阶段 2 接入';
  toast('创建房间功能将在阶段 2 上线');
});

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = roomCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    toast('请输入 6 位数字房间码');
    roomCodeInput.focus();
    return;
  }
  toast(`加入房间 ${code}：阶段 2 开放`);
});

roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.replace(/\D/g, '').slice(0, 6);
});
