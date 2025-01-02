import React, { useRef, useState } from 'react'
import { Typography, useTheme } from '@mui/material'
import { SessionType, createMessage } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import * as atoms from '../stores/atoms'
import { useSetAtom } from 'jotai'
import * as sessionActions from '../stores/sessionActions'
import {
    SendHorizontal,
    Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import icon from '../static/icon.png'
import pwIcon from '../static/playwright-logo.svg'
import { trackingEvent } from '@/packages/event'
import MiniButton from './MiniButton'
import _ from 'lodash'

export interface Props {
    currentSessionId: string
    currentSessionType: SessionType
}

export default function InputBox(props: Props) {
    const theme = useTheme()
    const setChatConfigDialogSession = useSetAtom(atoms.chatConfigDialogAtom)
    const { t } = useTranslation()
    const [messageInput, setMessageInput] = useState('')
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const [isPwActive, setIsPwVisible] = useState(false);

    const url = "http://localhost:5005/"
    const uri = "parse"
    const pwHandle = async () => {
        if(isPwActive) {
            setIsPwVisible(false)
        }
    
        // 'on' case
        const response = await fetch(url);
        if (response.status !== 404) {
            setIsPwVisible(false)
            alert('pw api is not started')
        }
        setIsPwVisible(!isPwActive)
    }

    const getFirstUrl = (messageInput: string) => {
        let inputUrls: RegExpMatchArray | null = find_urls(messageInput)
        let firstUrl: string

        if(inputUrls === null) {
            return false
        } 

        firstUrl = inputUrls[0].slice(1)
        return firstUrl
    }

    const find_urls = (messageInput: string) => {
        const regex = /!https?:\/\/[^\s]+/g;
        const matches = messageInput.match(regex);
        return matches
    }

    const pwParseRequest = async(messageInput: string, parseUrl: string) => {
        const response = await fetch(url + uri + '?url=' + parseUrl);
        const json = await response.json();  
        return json
    }

    const formMessage = (response: any, message: string) => {
        const descriptionMessege = "СИСТЕМНОЕ СООБЩЕНИЕ: в процессе парсинга сайта получены такие данные со страницы:"
        const resultMrssage = message + '\n' + descriptionMessege + '\n' + response['markdown'] + JSON.stringify(response['links'])
        return resultMrssage
    }

    const handleSubmit = async(needGenerating = true) => {
        if (messageInput.trim() === '') {
            return
        }

        let message: string = messageInput
        if(isPwActive) {
            let url = getFirstUrl(message)
            if(url) {
                let response = await pwParseRequest(messageInput, url!)
                message = formMessage(response, message)
            }
        }
        
        const newMessage = createMessage('user', message)
        sessionActions.submitNewUserMessage({
            currentSessionId: props.currentSessionId,
            newUserMsg: newMessage,
            needGenerating,
        })
        setMessageInput('')
        trackingEvent('send_message', { event_category: 'user' })
    }

    const minTextareaHeight = 66
    const maxTextareaHeight = 96

    const onMessageInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = event.target.value
        setMessageInput(input)
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (
            event.keyCode === 13 &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        ) {
            event.preventDefault()
            handleSubmit()
            return
        }
        if (event.keyCode === 13 && event.ctrlKey) {
            event.preventDefault()
            handleSubmit(false)
            return
        }
    }

    const [easterEgg, setEasterEgg] = useState(false)

    return (
        <div className='pl-2 pr-4'
            style={{
                borderTopWidth: '1px',
                borderTopStyle: 'solid',
                borderTopColor: theme.palette.divider,
            }}
        >
            <div className={cn('w-full mx-auto flex flex-col')}>
                <div className='flex flex-row flex-nowrap justify-between py-1'>
                    <div className='flex flex-row items-center'>
                        <div onClick={ () => pwHandle()} style={{ backgroundColor: isPwActive ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.5)', borderRadius: '20%', cursor: 'pointer',  width: '25px', height: '25px' }}>
                            <img src={pwIcon} style={{ width: '25px', height: '25px'}} />
                        </div>
                        <MiniButton className='mr-2 hover:bg-transparent' style={{ color: theme.palette.text.primary }}
                            onClick={() => {
                                setEasterEgg(true)
                                setTimeout(() => setEasterEgg(false), 1000)
                            }}
                        >
                            <img className={cn('w-5 h-5', easterEgg ? 'animate-spin' : '')} src={icon} />
                        </MiniButton>
                        <MiniButton className='mr-2' style={{ color: theme.palette.text.primary }}
                            onClick={() => setChatConfigDialogSession(sessionActions.getCurrentSession())}
                            tooltipTitle={
                                <div className='text-center inline-block'>
                                    <span>{t('Customize settings for the current conversation')}</span>
                                </div>
                            }
                            tooltipPlacement='top'
                        >
                            <Settings2 size='22' strokeWidth={1} />
                        </MiniButton>
                    </div>
                    <div className='flex flex-row items-center'>
                        <MiniButton className='w-8 ml-2'
                            style={{
                                color: theme.palette.getContrastText(theme.palette.primary.main),
                                backgroundColor: theme.palette.primary.main,
                            }}
                            tooltipTitle={
                                <Typography variant="caption">
                                    {t('[Enter] send, [Shift+Enter] line break, [Ctrl+Enter] send without generating')}
                                </Typography>
                            }
                            tooltipPlacement='top'
                            onClick={() => handleSubmit()}
                        >
                            <SendHorizontal size='22' strokeWidth={1} />
                        </MiniButton>
                    </div>
                </div>
                <div className='w-full pl-1 pb-2'>
                    <textarea
                        className={cn(
                            `w-full max-h-[${maxTextareaHeight}px]`,
                            'overflow-y resize-none border-none outline-none',
                            'bg-transparent p-1'
                        )}
                        value={messageInput} onChange={onMessageInput}
                        onKeyDown={onKeyDown}
                        ref={inputRef}
                        style={{
                            height: 'auto',
                            minHeight: minTextareaHeight + 'px',
                            color: theme.palette.text.primary,
                            fontFamily: theme.typography.fontFamily,
                            fontSize: theme.typography.body1.fontSize,
                        }}
                        placeholder={t('Type your question here...') || ''}
                    />
                    <div className='flex flex-row items-center'>
                    </div>
                </div>
            </div>
        </div>
    )
}
