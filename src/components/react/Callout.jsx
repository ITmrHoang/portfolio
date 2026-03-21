import React from "react";

export const Callout = ({ title, type, children }) => {
    const bgColors = {
        info: "bg-blue-100 border-blue-500 text-blue-900",
        warning: "bg-yellow-100 border-yellow-500 text-yellow-900",
        error: "bg-red-100 border-red-500 text-red-900",
        success: "bg-green-100 border-green-500 text-green-900",
    };

    const selectedClass = bgColors[type] || bgColors.info;

    return (
        <div className={`p-4 border-l-4 my-4 rounded-r-md ${selectedClass}`}>
            {title && <h4 className="font-bold text-lg mb-2">{title}</h4>}
            <div className="prose-sm">
                {children || "Đây là một khung cảnh báo tùy chỉnh (React Component)."}
            </div>
        </div>
    );
};
