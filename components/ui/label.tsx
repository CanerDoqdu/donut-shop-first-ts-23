import * as React from 'react';

export type LabelProps = React.ComponentPropsWithoutRef<'label'>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => (
    <label
      ref={ref}
      className={`text-sm font-medium text-gray-700 ${className}`}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export { Label };
