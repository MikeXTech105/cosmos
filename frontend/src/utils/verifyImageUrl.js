// Use an image load, not fetch: public image hosts may omit CORS headers.
export const verifyImageUrl = (url, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const image = new Image();
  const finish = (error) => {
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    if (error) reject(error);
    else resolve(url);
  };
  const timer = setTimeout(() => finish(new Error("The uploaded image could not be verified. Please retry before saving.")), timeoutMs);
  image.onload = () => finish();
  image.onerror = () => finish(new Error("The upload server returned an image URL that cannot be opened. The image has not been added. Ask your administrator to check /uploads file serving, then retry."));
  image.src = url;
});
