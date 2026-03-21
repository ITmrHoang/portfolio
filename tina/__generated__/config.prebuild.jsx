// tina/config.ts
import { defineConfig } from "tinacms";
var config_default = defineConfig({
  branch: process.env.HEAD || process.env.VERCEL_GIT_COMMIT_REF || "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  // Get this from tina.io
  token: process.env.TINA_TOKEN || "",
  // Get this from tina.io
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public"
    }
  },
  schema: {
    collections: [
      {
        name: "projects",
        label: "Projects",
        path: "src/content/projects",
        format: "mdx",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true
          },
          {
            type: "string",
            name: "description",
            label: "Description",
            ui: { component: "textarea" }
          },
          {
            type: "image",
            name: "coverImage",
            label: "Cover Image"
          },
          {
            type: "string",
            name: "technologies",
            label: "Technologies",
            list: true
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
            templates: [
              {
                name: "Callout",
                label: "Khung C\u1EA3nh B\xE1o UI",
                fields: [
                  { name: "title", label: "Ti\xEAu \u0111\u1EC1", type: "string" },
                  {
                    name: "type",
                    label: "Lo\u1EA1i (info/warning/error/success)",
                    type: "string",
                    options: ["info", "warning", "error", "success"]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "blog",
        label: "Blog Posts",
        path: "src/content/blog",
        format: "mdx",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true
          },
          {
            type: "datetime",
            name: "date",
            label: "Date"
          },
          {
            type: "string",
            name: "excerpt",
            label: "Excerpt",
            ui: { component: "textarea" }
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
            templates: [
              {
                name: "Callout",
                label: "Khung C\u1EA3nh B\xE1o UI",
                fields: [
                  { name: "title", label: "Ti\xEAu \u0111\u1EC1", type: "string" },
                  {
                    name: "type",
                    label: "Lo\u1EA1i (info/warning/error/success)",
                    type: "string",
                    options: ["info", "warning", "error", "success"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
