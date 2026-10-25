const Input = ({
  label,
  type = 'text',
  error,
  className = '',
  id,
  ...props
}) => {
  // The label points to the input (htmlFor/id) so screen readers and getByLabel find it.
  const inputId = id || props.name;

  const inputElement = type === 'textarea' ? (
    <textarea
      id={inputId}
      className={`form-input form-textarea text-white ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
  ) : (
    <input
      id={inputId}
      type={type}
      className={`form-input text-white ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
  );

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
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
