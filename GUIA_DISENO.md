# 🎨 GUÍA DE DISEÑO - Passly

## Paletas de Colores

### 🌙 **TEMA OSCURO** (Por defecto)

#### **Colores Principales**
```css
--bg-primary: #2E2E2E;        /* Fondo principal - Gris oscuro */
--bg-secondary: #1a1a1a;      /* Fondo secundario - Negro suave */
--card-bg: rgba(255, 255, 255, 0.05);  /* Tarjetas con glassmorphism */
```

#### **Textos**
```css
--text-primary: #FFFFFF;      /* Texto principal - Blanco puro */
--text-secondary: #cbd5e1;    /* Texto secundario - Gris claro */
--text-muted: #94a3b8;        /* Texto atenuado - Gris medio */
```

#### **Acentos**
```css
--accent-green: #2E7D32;      /* Verde institucional */
--accent-blue: #2979FF;       /* Azul eléctrico */
--accent-lavender: #B39DDB;   /* Lavanda (secundario) */
--accent-emerald: #66BB6A;    /* Esmeralda (secundario) */
```

#### **Estados**
```css
--error-color: #ef4444;       /* Rojo para errores */
--success-color: #22c55e;     /* Verde para éxito */
--warning-color: #f59e0b;     /* Naranja para advertencias */
```

---

### ☀️ **TEMA CLARO**

#### **Colores Principales**
```css
--bg-primary: #FAFAF5;        /* Fondo principal - Blanco hueso */
--bg-secondary: #FFFFFF;      /* Fondo secundario - Blanco puro */
--card-bg: rgba(255, 255, 255, 0.95);  /* Tarjetas con sombra suave */
```

#### **Textos**
```css
--text-primary: #212121;      /* Texto principal - Negro carbón */
--text-secondary: #475569;    /* Texto secundario - Gris oscuro */
--text-muted: #64748b;        /* Texto atenuado - Gris medio */
```

#### **Acentos**
```css
--accent-green: #66BB6A;      /* Verde esmeralda */
--accent-blue: #42A5F5;       /* Azul cielo */
--accent-lavender: #B39DDB;   /* Lavanda */
--accent-emerald: #66BB6A;    /* Esmeralda */
```

---

## 🔤 Tipografía

### **Fuentes Principales**
```css
--font-primary: 'Poppins', sans-serif;    /* Uso general */
--font-secondary: 'Roboto', sans-serif;   /* Inputs y textos */
--font-metrics: 'Inter', sans-serif;      /* Métricas y números */
```

### **Pesos de Fuente**
- **Light**: 300 - Textos secundarios
- **Regular**: 400 - Textos normales
- **Medium**: 500 - Énfasis moderado
- **Semibold**: 600 - Títulos
- **Bold**: 700 - Títulos importantes

### **Tamaños**
```css
h1: 28px;           /* Títulos principales */
h2: 24px;           /* Subtítulos */
h3: 20px;           /* Secciones */
body: 15-16px;      /* Texto normal */
small: 12-14px;     /* Textos pequeños */
```

---

## 🎭 Efectos Visuales

### **Sombras**
```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);    /* Sombra pequeña */
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);   /* Sombra media */
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.3);   /* Sombra grande */
```

### **Bordes**
```css
border-radius: 12px;          /* Botones e inputs */
border-radius: 20px;          /* Tarjetas */
border-radius: 50px;          /* Toggle de tema */
```

### **Glassmorphism**
```css
backdrop-filter: blur(10px);  /* Efecto de vidrio */
background: rgba(255, 255, 255, 0.05);  /* Fondo semi-transparente */
border: 1px solid rgba(255, 255, 255, 0.1);  /* Borde sutil */
```

---

## ✨ Animaciones

### **Transiciones**
```css
transition: all 0.3s ease;    /* Transición estándar */
```

### **Animaciones Clave**
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 🎨 Gradientes

### **Botones (Tema Oscuro)**
```css
background: linear-gradient(135deg, #2E7D32, #66BB6A);  /* Verde */
hover: linear-gradient(135deg, #2979FF, #B39DDB);       /* Azul-Lavanda */
```

### **Botones (Tema Claro)**
```css
background: linear-gradient(135deg, #66BB6A, #B39DDB);  /* Esmeralda-Lavanda */
hover: linear-gradient(135deg, #42A5F5, #B39DDB);       /* Azul-Lavanda */
```

### **Títulos**
```css
background: linear-gradient(135deg, var(--accent-green), var(--accent-blue));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 📐 Espaciado

### **Padding**
```css
card: 40px;           /* Tarjetas */
input: 14px 16px;     /* Inputs */
button: 14px;         /* Botones */
```

### **Margin**
```css
input: 10px 0;        /* Entre inputs */
button: 15px 0;       /* Botones */
sections: 20-30px;    /* Entre secciones */
```

### **Gap**
```css
checkbox-row: 10px;   /* Entre checkbox y label */
theme-toggle: 10px;   /* Entre icono y texto */
```

---

## 🎯 Estados de Componentes

### **Input Normal**
```css
background: var(--bg-secondary);
border: 2px solid var(--border-color);
color: var(--text-primary);
```

### **Input Focus**
```css
border-color: var(--accent-green);
box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
transform: translateY(-2px);
```

### **Input Error**
```css
border-color: var(--error-color);
animation: shake 0.3s ease;
```

### **Botón Normal**
```css
background: linear-gradient(135deg, var(--accent-green), var(--accent-emerald));
color: white;
```

### **Botón Hover**
```css
transform: translateY(-2px);
box-shadow: 0 8px 20px rgba(46, 125, 50, 0.3);
background: linear-gradient(135deg, var(--accent-blue), var(--accent-lavender));
```

### **Botón Disabled**
```css
background: var(--text-muted);
cursor: not-allowed;
transform: none;
```

---

## 🌈 Patrones de Fondo

### **Tema Oscuro**
```css
background-image: 
  radial-gradient(circle at 20% 50%, rgba(46, 125, 50, 0.1) 0%, transparent 50%),
  radial-gradient(circle at 80% 80%, rgba(41, 121, 255, 0.1) 0%, transparent 50%),
  radial-gradient(circle at 40% 20%, rgba(179, 157, 219, 0.08) 0%, transparent 50%);
```

### **Tema Claro**
```css
/* Mismo patrón con opacidades ajustadas */
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px) {
  .card { padding: 30px 20px; max-width: 90%; }
  h1 { font-size: 24px; }
  .theme-toggle { padding: 6px 12px; }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .card { max-width: 500px; }
}

/* Desktop */
@media (min-width: 769px) {
  .card { max-width: 450px; }
}
```

---

## 🎨 Scrollbar Personalizado

```css
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: var(--accent-green);
  border-radius: 10px;
  border: 2px solid var(--bg-secondary);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--accent-blue);
}
```

---

## 🔍 Accesibilidad

### **Contraste**
- Tema Oscuro: Blanco sobre gris oscuro (AAA)
- Tema Claro: Negro sobre blanco hueso (AAA)

### **Focus States**
- Todos los elementos interactivos tienen estados de focus visibles
- Outline personalizado con colores de acento

### **Touch Targets**
- Mínimo 44x44px para botones
- Padding generoso en elementos interactivos

---

## 📋 Checklist de Diseño

- [x] Paleta de colores coherente
- [x] Tipografía consistente
- [x] Espaciado uniforme
- [x] Animaciones suaves
- [x] Estados visuales claros
- [x] Responsive design
- [x] Accesibilidad básica
- [x] Glassmorphism
- [x] Gradientes
- [x] Sombras dinámicas
- [x] Scrollbar personalizado
- [x] Modo oscuro/claro

---

**🎨 Guía de diseño completa para Passly**

*Mantén la consistencia visual usando estas especificaciones*
