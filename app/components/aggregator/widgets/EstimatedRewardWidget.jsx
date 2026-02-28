import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { useUserProfile } from '../../../hooks/useProfile'

export default function EstimatedRewardWidget() {
  const { data: profileData } = useUserProfile()
  const ownWallet = profileData?.profile?.own_wallet

  const { data: reward = null, isLoading } = useQuery({
    queryKey: ['weekly-reward-estimate', ownWallet],
    queryFn: async () => {
      if (!ownWallet) return null
      const { data, error } = await supabase.rpc('get_user_weekly_reward_estimate', {
        p_wallet_address: ownWallet
      })
      if (error) throw error
      return data
    },
    enabled: !!ownWallet,
    staleTime: 5 * 60 * 1000,
  })

  if (!ownWallet) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', padding: 12 }}>
        Set your wallet in Profile to see estimated rewards
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 12 }}>
        Calculating...
      </div>
    )
  }

  const points = reward?.estimated_points ? Math.round(reward.estimated_points) : 0
  const rank = reward?.estimated_rank || '-'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Est. Reward</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
        {points > 0 ? points.toLocaleString() : '—'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        SoPoints {rank !== '-' ? `· Rank #${rank}` : ''}
      </div>
    </div>
  )
}
