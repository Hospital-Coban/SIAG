import React, { forwardRef } from 'react';

const Button = forwardRef(({ children, variant = 'primary', size = 'md', isLoading, className = '', ...props }, ref) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    error: 'btn-error',
    success: 'btn-success',
    warning: 'btn-warning',
    info: 'btn-info',
    outline: 'btn-outline',
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
