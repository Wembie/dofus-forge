// @vitest-environment jsdom
import {act,renderHook} from '@testing-library/react'
import {describe,it,expect,vi} from 'vitest'
import {useAuthFlow,type AuthServices} from '../useAuthFlow.ts'
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>key})}))
const event={preventDefault:()=>{}} as React.FormEvent
function setup(initialMode:'signin'|'signup'|'forgot'='signin'){
 const api:AuthServices={signIn:vi.fn().mockResolvedValue({error:null}),signUp:vi.fn().mockResolvedValue({error:null}),requestPasswordReset:vi.fn().mockResolvedValue({error:null})},close=vi.fn()
 const hook=renderHook(()=>useAuthFlow({onClose:close,initialMode,services:api}))
 act(()=>{hook.result.current.setEmail(' player@example.com ');hook.result.current.setPassword('abcdef');hook.result.current.setUsername(' Brasa ');hook.result.current.setCaptchaToken('test-token')})
 return {...hook,api,close}
}
describe('shared access flow',()=>{
 it('requires both legal acceptances before registering and normalizes the username',async()=>{const h=setup('signup');await act(()=>h.result.current.submit(event));expect(h.api.signUp).not.toHaveBeenCalled();act(()=>h.result.current.setAccepted({terms:true}));await act(()=>h.result.current.submit(event));expect(h.api.signUp).not.toHaveBeenCalled();act(()=>h.result.current.setAccepted({terms:true,privacy:true}));await act(()=>h.result.current.submit(event));expect(h.api.signUp).toHaveBeenCalledWith('player@example.com','abcdef','brasa','test-token');expect(h.result.current.signedUp).toBe(true);expect(h.close).not.toHaveBeenCalled()})
 it('closes only after successful sign-in',async()=>{const h=setup();await act(()=>h.result.current.submit(event));expect(h.close).toHaveBeenCalledTimes(1);expect(h.result.current.password).toBe('')})
 it('invalidates a consumed challenge on service errors and keeps the email',async()=>{const h=setup();vi.mocked(h.api.signIn).mockResolvedValueOnce({error:'Invalid credentials'});await act(()=>h.result.current.submit(event));expect(h.result.current.error).toBe('Invalid credentials');expect(h.result.current.captchaToken).toBeNull();expect(h.result.current.email).toContain('player@example.com');await act(()=>h.result.current.submit(event));expect(h.api.signIn).toHaveBeenCalledTimes(1)})
 it('recovers from thrown requests without leaving the form busy',async()=>{const h=setup();vi.mocked(h.api.signIn).mockRejectedValueOnce(new Error('offline'));await act(()=>h.result.current.submit(event));expect(h.result.current.busy).toBe(false);expect(h.result.current.error).toBe('auth_v4_connection_error');expect(h.result.current.captchaToken).toBeNull()})
 it('does not submit twice or apply a late response after switching mode',async()=>{const h=setup();let resolve!:(result:{error:null})=>void;vi.mocked(h.api.signIn).mockImplementationOnce(()=>new Promise(r=>{resolve=r}));let pending!:Promise<void>;act(()=>{pending=h.result.current.submit(event);void h.result.current.submit(event)});expect(h.api.signIn).toHaveBeenCalledTimes(1);act(()=>h.result.current.switchMode('signup'));await act(async()=>{resolve({error:null});await pending});expect(h.close).not.toHaveBeenCalled();expect(h.result.current.mode).toBe('signup');expect(h.result.current.password).toBe('')})
 it('uses the same neutral confirmation for password recovery',async()=>{const h=setup('forgot');await act(()=>h.result.current.submit(event));expect(h.api.requestPasswordReset).toHaveBeenCalledWith('player@example.com','test-token');expect(h.result.current.resetSent).toBe(true)})
})
