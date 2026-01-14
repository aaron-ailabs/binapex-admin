"use client"

import { useCallback } from 'react'

type SoundType = 'success' | 'warning' | 'error' | 'notification' | 'loss' | 'expiry'

export function useSoundEffects() {
    const play = useCallback((type: SoundType) => {
        try {
            const soundPaths: Record<SoundType, string> = {
                success: '/sounds/success.mp3',
                warning: '/sounds/warning.mp3',
                error: '/sounds/loss.mp3',
                notification: '/sounds/notification.mp3',
                loss: '/sounds/loss.mp3',
                expiry: '/sounds/expiry.mp3'
            }

            const audio = new Audio(soundPaths[type])
            audio.volume = 0.5

            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Audio playback failed:', error)
                })
            }
        } catch (error) {
            console.error('Failed to play sound:', error)
        }
    }, [])

    return { play }
}
