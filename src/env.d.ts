/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** Giscus — lấy trên https://giscus.app (để trống categoryId thì ẩn bình luận) */
	readonly PUBLIC_GISCUS_REPO?: string;
	readonly PUBLIC_GISCUS_REPO_ID?: string;
	readonly PUBLIC_GISCUS_CATEGORY?: string;
	readonly PUBLIC_GISCUS_CATEGORY_ID?: string;
	/** Tự đặt trong astro.config.mjs mỗi lần build — không cần khai báo */
	readonly PUBLIC_BUILD_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
