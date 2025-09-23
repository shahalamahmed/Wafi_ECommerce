'use client'
import { useEffect, useState } from "react"

const msInSecond = 1000
const msInMinute = 60 * 1000
const msInAHour = 60 * msInMinute
const msInADay = 24 * msInAHour

const getPartsofTimeDuration = (duration) => {
    const days = Math.floor(duration / msInADay)
    const hours = Math.floor((duration % msInADay) / msInAHour)
    const minutes = Math.floor((duration % msInAHour) / msInMinute)
    const seconds = Math.floor((duration % msInMinute) / msInSecond)

    return { days, hours, minutes, seconds }
}

const Countdown = (endDateTime) => {
    const [timeParts, setTimeParts] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        
        const updateCountdown = () => {
            const now = Date.now()
            const future = new Date(endDateTime.endDateTime).getTime()
            const timeDif = future - now
            const parts = getPartsofTimeDuration(timeDif)
            setTimeParts(parts)
        }

        // Initial update
        updateCountdown()

        // Update every second
        const interval = setInterval(updateCountdown, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [endDateTime.endDateTime])

    // Show loading state during hydration
    if (!isClient) {
        return (
            <>
                <span className="cdown days"> <span className="time-count">0</span>
                    <p>Days</p>
                </span>
                <span className="cdown hour"> <span className="time-count">0</span>
                    <p>Hour</p>
                </span>
                <span className="cdown minutes"> <span className="time-count">0</span>
                    <p>Minute</p>
                </span>
                <span className="cdown second"> <span className="time-count">0</span>
                    <p>Second</p>
                </span>
            </>
        )
    }

    return (
        <>
            <span className="cdown days"> <span className="time-count">{timeParts.days}</span>
                <p>Days</p>
            </span>
            <span className="cdown hour"> <span className="time-count">{timeParts.hours}</span>
                <p>Hour</p>
            </span>
            <span className="cdown minutes"> <span className="time-count">{timeParts.minutes}</span>
                <p>Minute</p>
            </span>
            <span className="cdown second"> <span className="time-count">{timeParts.seconds}</span>
                <p>Second</p>
            </span>
        </>
    )
}

export default Countdown