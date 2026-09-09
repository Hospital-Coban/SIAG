import React, { forwardRef } from 'react';

const Select = forwardRef(({ label, error, options = [], className = '', children, ...props }, ref) => {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <select
        ref={ref}
        className={`select select-bordered w-full ${error ? 'select-error' : ''} ${className}`}
        {...props}
      >
        {children ? (
          children
        ) : (
          <>
            <option disabled value="">
              Seleccione una opción
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </>
        )}
      </select>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
