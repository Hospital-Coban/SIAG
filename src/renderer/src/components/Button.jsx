import React, { forwardRef } from 'react';

const Button = forwardRef(({ children, variant = 'primary', size = 'md', isLoading, className = '', ...props }, ref) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-soft btn-primary',
    secondary: 'btn-soft btn-secondary',
    accent: 'btn-soft btn-accent',
    ghost: 'btn-soft btn-neutral',
    link: 'btn-soft btn-neutral',
    error: 'btn-soft btn-error',
    success: 'btn-soft btn-success',
    warning: 'btn-soft btn-warning',
    info: 'btn-soft btn-info',
    outline: 'btn-soft',
  };
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant] || ''} ${sizeClasses[size] || ''} ${className}`;

  return (
    <button ref={ref} className={classes} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <span className="loading loading-spinner"></span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
