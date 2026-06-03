import { useSelector } from "react-redux";

const usePermission = (
  route
) => {
  const pages = useSelector(
    (state) => state.auth.pages
  );

  return pages.find(
    (page) =>
      page.route === route
  );
};

export default usePermission;