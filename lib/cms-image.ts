import { getImageProps } from "next/image";

/** Diisi next.config dari R2_PUBLIC_URL; hanya unggahan di alamat ini yang boleh lewat pengoptimal gambar. */
const cmsImageOrigin = process.env.CMS_IMAGE_ORIGIN ?? "";

/**
 * Gambar yang bisa diperkecil dan diubah ke AVIF/WebP oleh pengoptimal Next: unggahan R2, gambar di database
 * (/media/…), dan aset public/images. SVG, PDF, dan URL luar ditampilkan apa adanya.
 */
export function canOptimize(src: string) {
  if (/\.(svg|pdf)(?:$|[?#])/i.test(src)) return false;
  return src.startsWith("/media/") || src.startsWith("/images/") || (Boolean(cmsImageOrigin) && src.startsWith(`${cmsImageOrigin}/uploads/`));
}

/**
 * `src`, `srcSet`, dan `sizes` versi teroptimasi untuk sebuah gambar CMS, atau `null` bila tidak bisa dioptimalkan.
 * `sizes` menentukan lebar yang dipilih peramban, jadi isi sesuai lebar tampil gambarnya.
 */
export function optimizedImage(src: string, sizes: string) {
  if (!canOptimize(src)) return null;
  // Lebar dan tinggi hanya untuk membangun srcset; ukuran tampil tetap diatur CSS.
  const { props } = getImageProps({ src, alt: "", width: 1920, height: 1080, sizes, quality: 75 });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
