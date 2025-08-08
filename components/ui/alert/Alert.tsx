import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  showLink?: boolean;
  linkHref?: string;
  linkText?: string;
  className?: string;
}

const variantStyles = {
  success: {
    container: "bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800",
    icon: "text-success-600 dark:text-success-400",
    title: "text-success-800 dark:text-success-300",
    message: "text-success-700 dark:text-success-400",
    link: "text-success-700 hover:text-success-800 dark:text-success-400 dark:hover:text-success-300",
  },
  warning: {
    container: "bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800",
    icon: "text-warning-600 dark:text-warning-400",
    title: "text-warning-800 dark:text-warning-300",
    message: "text-warning-700 dark:text-warning-400",
    link: "text-warning-700 hover:text-warning-800 dark:text-warning-400 dark:hover:text-warning-300",
  },
  error: {
    container: "bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800",
    icon: "text-error-600 dark:text-error-400",
    title: "text-error-800 dark:text-error-300",
    message: "text-error-700 dark:text-error-400",
    link: "text-error-700 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300",
  },
  info: {
    container: "bg-info-50 border-info-200 dark:bg-info-900/20 dark:border-info-800",
    icon: "text-info-600 dark:text-info-400",
    title: "text-info-800 dark:text-info-300",
    message: "text-info-700 dark:text-info-400",
    link: "text-info-700 hover:text-info-800 dark:text-info-400 dark:hover:text-info-300",
  },
};

const icons = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289C13.3166 6.90237 12.6834 6.90237 12.2929 7.29289L9 10.5858L7.70711 9.29289C7.31658 8.90237 6.68342 8.90237 6.29289 9.29289C5.90237 9.68342 5.90237 10.3166 6.29289 10.7071L8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.7071 8.70711Z" fill="currentColor"/>
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.4842 3.52183C9.10432 2.49272 10.8957 2.49272 11.5158 3.52183L17.5317 13.7757C18.1195 14.7506 17.4547 16 16.0159 16H3.98408C2.54527 16 1.88051 14.7506 2.46827 13.7757L8.4842 3.52183ZM10 6C10.5523 6 11 6.44772 11 7V10C11 10.5523 10.5523 11 10 11C9.44772 11 9 10.5523 9 10V7C9 6.44772 9.44772 6 10 6ZM10 14C10.5523 14 11 13.5523 11 13C11 12.4477 10.5523 12 10 12C9.44772 12 9 12.4477 9 13C9 13.5523 9.44772 14 10 14Z" fill="currentColor"/>
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM8.70711 7.29289C8.31658 6.90237 7.68342 6.90237 7.29289 7.29289C6.90237 7.68342 6.90237 8.31658 7.29289 8.70711L8.58579 10L7.29289 11.2929C6.90237 11.6834 6.90237 12.3166 7.29289 12.7071C7.68342 13.0976 8.31658 13.0976 8.70711 12.7071L10 11.4142L11.2929 12.7071C11.6834 13.0976 12.3166 13.0976 12.7071 12.7071C13.0976 12.3166 13.0976 11.6834 12.7071 11.2929L11.4142 10L12.7071 8.70711C13.0976 8.31658 13.0976 7.68342 12.7071 7.29289C12.3166 6.90237 11.6834 6.90237 11.2929 7.29289L10 8.58579L8.70711 7.29289Z" fill="currentColor"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10ZM11 6C11 6.55228 10.5523 7 10 7C9.44772 7 9 6.55228 9 6C9 5.44772 9.44772 5 10 5C10.5523 5 11 5.44772 11 6ZM9 9C8.44772 9 8 9.44772 8 10C8 10.5523 8.44772 11 9 11V14C9 14.5523 9.44772 15 10 15H11C11.5523 15 12 14.5523 12 14C12 13.4477 11.5523 13 11 13V10C11 9.44772 10.5523 9 10 9H9Z" fill="currentColor"/>
    </svg>
  ),
};

const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  showLink = false,
  linkHref = "/",
  linkText = "Learn more",
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        styles.container,
        className
      )}
    >
      <div className={cn("flex-shrink-0", styles.icon)}>
        {icons[variant]}
      </div>
      <div className="flex-1">
        <h3 className={cn("font-semibold text-sm", styles.title)}>{title}</h3>
        <p className={cn("mt-1 text-sm", styles.message)}>{message}</p>
        {showLink && (
          <Link
            href={linkHref}
            className={cn(
              "mt-2 inline-flex items-center text-sm font-medium underline",
              styles.link
            )}
          >
            {linkText}
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Alert;