import { useEffect } from "react";
import { useDispatch } from "react-redux";

import {
  clearCredentials,
  replaceAuthSnapshot,
} from "../../store/slices/authSlice";
import {
  AUTH_STORAGE_EVENT,
  AUTH_STORAGE_KEYS,
  AUTH_STORAGE_OWNER_KEY,
  getAuthData,
} from "../../utils/authStorage";

const watchedStorageKeys = new Set([
  AUTH_STORAGE_OWNER_KEY,
  ...Object.values(AUTH_STORAGE_KEYS),
]);

const AuthSessionSync = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const applySnapshot = (snapshot) => {
      if (snapshot?.accessToken) {
        dispatch(replaceAuthSnapshot(snapshot));
      } else {
        dispatch(clearCredentials());
      }
    };
    const handleStorage = (event) => {
      if (watchedStorageKeys.has(event.key)) {
        applySnapshot(getAuthData());
      }
    };
    const handleSameTabChange = (event) => {
      applySnapshot(event.detail ?? getAuthData());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_STORAGE_EVENT, handleSameTabChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_STORAGE_EVENT, handleSameTabChange);
    };
  }, [dispatch]);

  return null;
};

export default AuthSessionSync;
