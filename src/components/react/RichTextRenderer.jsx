import React from "react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { Callout } from "./Callout";

const components = {
    Callout: (props) => <Callout {...props} />,
};

export const RichTextRenderer = ({ content }) => {
    return (
        <div className="prose prose-lg prose-indigo mx-auto mt-6 text-gray-800">
            <TinaMarkdown content={content} components={components} />
        </div>
    );
};
