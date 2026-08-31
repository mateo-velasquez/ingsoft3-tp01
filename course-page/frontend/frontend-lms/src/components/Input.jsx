const Input = ({
  label,
  type = 'text',
  error,
  className = '',
  ...props
}) => {
  const inputElement = type === 'textarea' ? (
    <textarea
      className={`form-input form-textarea text-white ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
  ) : (
    <input
      type={type}
      className={`form-input text-white ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
  );

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}
      {inputElement}
      {error && (
        <div className="text-danger text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default Input;
