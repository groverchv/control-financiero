const formatPhone = (val) => {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 8)}`;
};

export const Input = ({
  label,
  id,
  type = 'text',
  error,
  className = '',
  isCurrency = false,
  ...props
}) => {
  const baseClasses = `w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`;

  const handleOnChange = (e) => {
    if (type === 'tel') {
      e.target.value = formatPhone(e.target.value);
    } else if (type === 'number' && e.target.value) {
      const val = e.target.value;
      if (val.startsWith('0') && !val.startsWith('0.') && !isNaN(Number(val))) {
        e.target.value = String(Number(val));
      } else if (val.startsWith('-0') && !val.startsWith('-0.') && !isNaN(Number(val))) {
        e.target.value = String(Number(val));
      }
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const handleOnBlur = (e) => {
    if (type === 'number' && isCurrency && e.target.value) {
      const num = parseFloat(e.target.value);
      if (!isNaN(num)) {
        e.target.value = num.toFixed(2);
        if (props.onChange) {
          props.onChange(e);
        }
      }
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const handleKeyDown = (e) => {
    if (type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  const handleWheel = (e) => {
    if (type === 'number') {
      e.target.blur();
    }
    if (props.onWheel) {
      props.onWheel(e);
    }
  };

  // Generar placeholder de ejemplo si no se especifica
  let placeholder = props.placeholder;
  if (!placeholder && label) {
    let textLabel = '';
    if (typeof label === 'string') {
      textLabel = label.toLowerCase();
    } else if (label.props && typeof label.props.children === 'string') {
      textLabel = label.props.children.toLowerCase();
    }

    if (textLabel.includes('activo') || textLabel.includes('equipo') || textLabel.includes('patrimonio') || textLabel.includes('bien')) {
      placeholder = 'Ej. Laptop Lenovo ThinkPad';
    } else if (textLabel.includes('nombre') || textLabel.includes('socio') || textLabel.includes('miembro') || textLabel.includes('persona')) {
      placeholder = 'Ej. Juan Pérez';
    } else if (textLabel.includes('email') || textLabel.includes('correo')) {
      placeholder = 'Ej. usuario@dominio.com';
    } else if (textLabel.includes('teléfono') || textLabel.includes('celular') || textLabel.includes('phone') || textLabel.includes('telf')) {
      placeholder = 'Ej. 700-12345';
    } else if (textLabel.includes('monto') || textLabel.includes('valor') || textLabel.includes('precio') || textLabel.includes('costo') || textLabel.includes('ingreso') || textLabel.includes('egreso') || textLabel.includes('cupo')) {
      placeholder = 'Ej. 1500';
    } else if (textLabel.includes('fecha')) {
      placeholder = 'AAAA-MM-DD';
    } else if (textLabel.includes('descripción') || textLabel.includes('concepto') || textLabel.includes('detalle') || textLabel.includes('comentario')) {
      placeholder = 'Ej. Pago mensual de cuotas...';
    } else if (textLabel.includes('dirección') || textLabel.includes('ubicación')) {
      placeholder = 'Ej. Av. Arce #123';
    } else if (textLabel.includes('ci') || textLabel.includes('documento') || textLabel.includes('identidad')) {
      placeholder = 'Ej. 1234567';
    } else if (textLabel.includes('latitud')) {
      placeholder = 'Ej. -16.5000';
    } else if (textLabel.includes('longitud')) {
      placeholder = 'Ej. -68.1500';
    } else {
      placeholder = `Ej. Ingrese ${textLabel}...`;
    }
  }

  return (
    <div className="space-y-2 w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={id}
          className={`${baseClasses} min-h-[100px] resize-none`}
          placeholder={placeholder}
          {...props}
          onChange={handleOnChange}
          onBlur={handleOnBlur}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={baseClasses}
          placeholder={placeholder}
          {...props}
          onChange={handleOnChange}
          onBlur={handleOnBlur}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
        />
      )}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};

