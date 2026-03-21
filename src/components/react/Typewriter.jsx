import React, { useState, useEffect } from 'react';

export const Typewriter = ({ strings = ["Xin chào!", "Tôi là lập trình viên."], loop = true, typingSpeed = 100, deletingSpeed = 50, delayBetween = 1500 }) => {
    const [displayText, setDisplayText] = useState('');
    const [stringIndex, setStringIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer;
        const currentString = strings[stringIndex];

        if (isDeleting) {
            if (displayText.length > 0) {
                timer = setTimeout(() => {
                    setDisplayText(currentString.substring(0, displayText.length - 1));
                }, deletingSpeed);
            } else {
                setIsDeleting(false);
                setStringIndex((prev) => (prev + 1) % strings.length);
                if (!loop && stringIndex === strings.length - 1) return;
            }
        } else {
            if (displayText.length < currentString.length) {
                timer = setTimeout(() => {
                    setDisplayText(currentString.substring(0, displayText.length + 1));
                }, typingSpeed);
            } else {
                timer = setTimeout(() => {
                    setIsDeleting(true);
                }, delayBetween);
            }
        }

        return () => clearTimeout(timer);
    }, [displayText, isDeleting, stringIndex, strings, loop, typingSpeed, deletingSpeed, delayBetween]);

    return (
        <span className="inline-flex items-center">
            <span className="text-gray-900 font-bold">{displayText}</span>
            <span className="w-1 h-6 ml-1 bg-indigo-600 animate-pulse inline-block"></span>
        </span>
    );
};
