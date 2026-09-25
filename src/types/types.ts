import type { CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;
export type BlogPost = CollectionEntry<'blog'>;
export type Note = CollectionEntry<'notes'>;

// riêng cho formarter
// type ProjectData = Project['data'];
// type BlogData = BlogPost['data'];
// type NoteData = Note['data'];


export type ProjectData = {
  title: string;
  description?: string;
  coverImage?: string;
  technologies?: string[];
};

export type BlogData = {
  title: string;
  date: Date;
  excerpt?: string;
};

export type NoteData = {
  title: string;
  date: Date;
  topic:
    | 'Frontend'
    | 'Backend'
    | 'AI'
    | 'DevOps'
    | 'Design'
    | 'DSA'
    | 'Design Pattern'
    | 'Khác';
};