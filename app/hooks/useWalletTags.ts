'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import {
  addPrivateTag, renameTag, deleteTag, fetchUserTags, WalletTag,
  fetchUserGroups, createGroup, deleteGroup, renameGroup,
  assignToGroup, assignMultipleToGroup, WalletGroup, GroupColor
} from '../lib/walletTags'

export function useWalletTags() {
  const { user } = useSessionContext()

  return useQuery({
    queryKey: ['wallet-tags', user?.id],
    queryFn: fetchUserTags,
    staleTime: 5 * 60 * 1000,
    enabled: !!user
  })
}

export function useAddTag() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ wallet, name }: { wallet: string; name: string }) => {
      return addPrivateTag(wallet, name)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    }
  })
}

export function useRenameTag() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagId, newName }: { tagId: string; newName: string }) => {
      return renameTag(tagId, newName)
    },
    onMutate: async ({ tagId, newName }) => {
      await queryClient.cancelQueries({ queryKey: ['wallet-tags', user?.id] })
      const prev = queryClient.getQueryData<WalletTag[]>(['wallet-tags', user?.id])
      queryClient.setQueryData<WalletTag[]>(['wallet-tags', user?.id], (old) =>
        old?.map(t => t.id === tagId ? { ...t, tag_name: newName } : t)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['wallet-tags', user?.id], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    }
  })
}

export function useDeleteTag() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tagId: string) => {
      return deleteTag(tagId)
    },
    onMutate: async (tagId) => {
      await queryClient.cancelQueries({ queryKey: ['wallet-tags', user?.id] })
      const prev = queryClient.getQueryData<WalletTag[]>(['wallet-tags', user?.id])
      queryClient.setQueryData<WalletTag[]>(['wallet-tags', user?.id], (old) =>
        old?.filter(t => t.id !== tagId)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['wallet-tags', user?.id], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    }
  })
}

// Group hooks

export function useWalletGroups() {
  const { user } = useSessionContext()

  return useQuery({
    queryKey: ['wallet-groups', user?.id],
    queryFn: fetchUserGroups,
    staleTime: 5 * 60 * 1000,
    enabled: !!user
  })
}

export function useCreateGroup() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: GroupColor }) => {
      return createGroup(name, color)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-groups', user?.id] })
    }
  })
}

export function useDeleteGroup() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      return deleteGroup(groupId)
    },
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ['wallet-groups', user?.id] })
      const prev = queryClient.getQueryData<WalletGroup[]>(['wallet-groups', user?.id])
      queryClient.setQueryData<WalletGroup[]>(['wallet-groups', user?.id], (old) =>
        old?.filter(g => g.id !== groupId)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['wallet-groups', user?.id], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-groups', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
    }
  })
}

export function useRenameGroup() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, newName }: { groupId: string; newName: string }) => {
      return renameGroup(groupId, newName)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-groups', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
    }
  })
}

export function useAssignToGroup() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagId, groupName }: { tagId: string; groupName: string | null }) => {
      return assignToGroup(tagId, groupName)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
    }
  })
}

export function useBulkAssignToGroup() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagIds, groupName }: { tagIds: string[]; groupName: string }) => {
      return assignMultipleToGroup(tagIds, groupName)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-tags', user?.id] })
    }
  })
}
