import { api, withShape } from "@/lib/api";
import type { Permission, RoleKey } from "@/lib/permissions";
import { queryKeys, useApiMutation, useApiQuery } from "@/lib/query";

export interface Member {
  id: string;
  userId: string;
  roleKey: RoleKey;
  extraPermissions: Permission[];
  name?: string;
  email?: string;
}

export interface Invitation {
  id: string;
  email: string;
  roleKey: RoleKey;
  expiresAt: string;
  createdAt: string;
}

// Returned once, when sent: the token lets the inviter share the link by hand as well.
export interface SentInvitation extends Omit<Invitation, "createdAt"> {
  token: string;
}

export interface MemberChanges {
  roleKey?: RoleKey;
  extraPermissions?: Permission[];
}

// A member's role can change this person's own permissions and the role shown in the switcher,
// so changes reload everything under ["businesses"].
const reloadBusinesses = { invalidates: [queryKeys.businesses] };

export const useMembers = (businessId: string) =>
  useApiQuery(queryKeys.members(businessId), () =>
    withShape<Member[]>(api.GET("/api/v1/businesses/{businessId}/members", { params: { path: { businessId } } })),
  );

export const useUpdateMember = (businessId: string) =>
  useApiMutation(
    ({ memberId, ...body }: MemberChanges & { memberId: string }) =>
      api.PATCH("/api/v1/businesses/{businessId}/members/{memberId}", { params: { path: { businessId, memberId } }, body }),
    reloadBusinesses,
  );

export const useRemoveMember = (businessId: string) =>
  useApiMutation(
    (memberId: string) => api.DELETE("/api/v1/businesses/{businessId}/members/{memberId}", { params: { path: { businessId, memberId } } }),
    reloadBusinesses,
  );

// Only people who can manage members may see pending invitations, so only their screen asks.
export const useInvitations = (businessId: string) =>
  useApiQuery(queryKeys.invitations(businessId), () =>
    withShape<Invitation[]>(api.GET("/api/v1/businesses/{businessId}/invitations", { params: { path: { businessId } } })),
  );

export const useInvite = (businessId: string) =>
  useApiMutation(
    (body: { email: string; roleKey: Exclude<RoleKey, "OWNER"> }) =>
      withShape<SentInvitation>(api.POST("/api/v1/businesses/{businessId}/invitations", { params: { path: { businessId } }, body })),
    { invalidates: [queryKeys.invitations(businessId)] },
  );

export const useRevokeInvitation = (businessId: string) =>
  useApiMutation(
    (invitationId: string) =>
      api.DELETE("/api/v1/businesses/{businessId}/invitations/{invitationId}", { params: { path: { businessId, invitationId } } }),
    { invalidates: [queryKeys.invitations(businessId)] },
  );

export const useAcceptInvitation = () =>
  useApiMutation((token: string) => api.POST("/api/v1/invitations/accept", { body: { token } }), reloadBusinesses);

// The address of the page that accepts an invitation, as the email links to it.
export const invitationLink = (token: string) => `${window.location.origin}/invitations/accept?token=${encodeURIComponent(token)}`;
