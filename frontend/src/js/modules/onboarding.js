/**
 * @file onboarding.js
 * @description Guía tutorial interactiva para nuevos usuarios de Passly Pro.
 */

const ONBOARDING_KEY = 'passly_pro_onboarding_completed';

export function checkOnboarding() {
  if (!localStorage.getItem(ONBOARDING_KEY)) {
    // Retrasar inicio para asegurar que el DOM esté listo
    setTimeout(() => startOnboarding(), 1500);
  }
}

export function startOnboarding() {
  const steps = [
    {
      title: "Bienvenido a Passly Pro",
      text: "Estamos listos para modernizar la seguridad de tu sede. Esta guía rápida te enseñará lo esencial.",
      target: null // Centrado
    },
    {
      title: "Panel de Navegación",
      text: "Aquí encontrarás todos tus módulos operativos según tu nivel de acceso.",
      target: "#sidebar"
    },
    {
      title: "Identidades y Accesos",
      text: "Gestiona residentes, visitantes y personal desde aquí con un solo clic.",
      target: "[data-view='usuarios']"
    },
    {
      title: "Reportes Profesionales",
      text: "Exporta tus logs en PDF con el branding de tu empresa.",
      target: ".btn-export-pdf"
    },
    {
      title: "Tu Perfil",
      text: "Configura tu logo y datos personales. Si no tienes logo, verás un avatar corporativo por defecto.",
      target: "#profile-trigger"
    }
  ];

  let currentStep = 0;

  function showStep(index) {
    const step = steps[index];
    renderOnboardingUI(step, index, steps.length, () => {
      if (index + 1 < steps.length) {
        showStep(index + 1);
      } else {
        finishOnboarding();
      }
    });
  }

  showStep(currentStep);
}

function renderOnboardingUI(step, index, total, onNext) {
  // Limpiar onboarding previo
  const existing = document.getElementById('onboarding-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300';
  
  const modal = document.createElement('div');
  modal.className = 'w-[90%] max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in duration-300';
  
  modal.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Paso ${index + 1} de ${total}</span>
        <button id="close-onboarding" class="text-slate-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <h3 class="text-xl font-bold text-white">${step.title}</h3>
      <p class="text-slate-300 leading-relaxed">${step.text}</p>
      <div class="pt-4 flex justify-end">
        <button id="next-onboarding" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all active:scale-95">
          ${index === total - 1 ? '¡Comenzar!' : 'Siguiente'}
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Lógica de resaltado
  if (step.target) {
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('onboarding-highlight');
      // Limpiar clase al cambiar
      const cleanup = () => targetEl.classList.remove('onboarding-highlight');
      modal.querySelector('#next-onboarding').addEventListener('click', cleanup);
      modal.querySelector('#close-onboarding').addEventListener('click', cleanup);
    }
  }

  modal.querySelector('#next-onboarding').onclick = onNext;
  modal.querySelector('#close-onboarding').onclick = finishOnboarding;
}

function finishOnboarding() {
  document.getElementById('onboarding-overlay')?.remove();
  localStorage.setItem(ONBOARDING_KEY, 'true');
}
