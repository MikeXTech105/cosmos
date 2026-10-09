export const today = () => {
  const current = new Date();
  const offset = current.getTimezoneOffset();

  return new Date(current.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const getItems = (response) =>
  Array.isArray(response?.data?.items) ? response.data.items : [];
