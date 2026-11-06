import { useParams } from "react-router";
import { useAppSelector } from "@/app/store";
import { lastBusiness } from "@/lib/preferences";
import { useBusinesses } from "./api";

// The business in the address (/b/:businessId), or on pages without one (settings), the last one used.
export const useCurrentBusiness = () => {
  const { businessId } = useParams();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const businesses = useBusinesses();
  const list = businesses.data ?? [];
  const wanted = businessId ?? (userId ? lastBusiness(userId) : null);
  const business = list.find((item) => item.id === wanted) ?? (businessId ? undefined : list[0]);
  return { business, businesses: list, isLoading: businesses.isLoading, notFound: Boolean(businessId) && businesses.isSuccess && !business };
};
