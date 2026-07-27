export type UploadResult<T> = { status: number; ok: boolean; data: T };

export function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  options: { signal?: AbortSignal; onProgress?: (ratio: number) => void } = {},
): Promise<UploadResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        data: xhr.response as T,
      });
    };
    xhr.onerror = () => reject(new Error("network-error"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort());
    }
    xhr.send(formData);
  });
}
