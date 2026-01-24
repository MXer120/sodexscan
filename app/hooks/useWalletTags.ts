'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { addPrivateTag, renameTag, deleteTag, fetchUserTags, WalletTag } from '../lib/walletTags'

export function useWalletTags() {
  const { user } = useSessionContext()

  return useQuery({
    queryKey: ['wallet-tags', user?.id],
    queryFn: fetchUserTags,
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
