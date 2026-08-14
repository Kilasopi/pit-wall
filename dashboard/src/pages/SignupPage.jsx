import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';
import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function SignupPage() {
    const{ register } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await register(username, password);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not register');
        } finally {
            setSubmitting(false);
        }
    }

    return(
        <div className="grid min-h-screen bg-background text-foreground grid-cols-1 md:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-[#08070c] p-12 text-white md:flex">
                {/* Base gradient background */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            radial-gradient(circle at 15% 20%, rgba(236,72,153,0.22), transparent 30%),
                            radial-gradient(circle at 85% 75%, rgba(34,211,238,0.18), transparent 32%),
                            linear-gradient(145deg, #09070d 0%, #1a0831 42%, #0a0911 100%)
                        `,
                    }}
                />

                {/* Wavy texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.14] mix-blend-screen"
                    style={{
                        backgroundImage: `
                            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cdefs%3E%3Cpattern id='waves' x='0' y='0' width='160' height='160' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 80 Q 40 40 80 80 T 160 80' fill='none' stroke='white' stroke-width='3' stroke-opacity='0.9'/%3E%3Cpath d='M0 110 Q 40 70 80 110 T 160 110' fill='none' stroke='white' stroke-width='3' stroke-opacity='0.65'/%3E%3Cpath d='M0 140 Q 40 100 80 140 T 160 140' fill='none' stroke='white' stroke-width='3' stroke-opacity='0.45'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23waves)'/%3E%3C/svg%3E")
                        `,
                        backgroundSize: '220px 220px',
                        backgroundPosition: 'center',
                    }}
                />

                {/* Diagonal livery stripes */}
                <div
                    className="absolute -left-24 top-[22%] h-3 w-[135%] -rotate-[12deg] opacity-80"
                    style={{
                        background:
                            'linear-gradient(90deg, transparent 0%, transparent 10%, #ec4899 35%, #d946ef 55%, transparent 85%, transparent 100%)',
                    }}
                />
                <div
                    className="absolute -left-20 top-[26%] h-1.5 w-[125%] -rotate-[12deg] opacity-75"
                    style={{
                        background:
                            'linear-gradient(90deg, transparent 0%, transparent 15%, #22d3ee 42%, transparent 82%)',
                    }}
                />

                {/* Glows */}
                <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute -right-32 top-8 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

                <div className="relative z-10 flex w-full flex-col justify-between">
                    {/* Top logo area */}
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-sm">
                            <img
                                src="/NeonSmoothie.png"
                                alt="Team M.U.R.D.E.R giraffe logo"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold tracking-[0.55em] text-cyan-300">
                                TEAM
                            </div>
                            <div className="text-xl font-black tracking-[0.15em]">
                                M.U.R.D.E.R.
                            </div>
                        </div>
                    </div>

                    {/* Main branding */}
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="h-px w-10 bg-pink-500" />
                            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-pink-400">
                                Racing
                            </span>
                        </div>

                        <h1 className="max-w-xl font-heading text-5xl font-black uppercase leading-[0.92] tracking-tight lg:text-6xl">
                            Register to
                            <br />
                            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                                the Pit Wall
                            </span>
                        </h1>

                        <p className="mt-6 max-w-md text-sm leading-6 text-white/60">
                            Driver registration, race operations, and team management
                            for M.U.R.D.E.R. Racing.
                            (Eventually more teams)
                        </p>
                    </div>

                    {/* Bottom bar */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/35">
                            Mostly • Unhinged • Racing • Drivers • Endurance • Racing
                        </span>

                        <div className="flex gap-1.5">
                            <div className="h-1.5 w-6 bg-cyan-400" />
                            <div className="h-1.5 w-6 bg-fuchsia-500" />
                            <div className="h-1.5 w-2 bg-yellow-400" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sign Up</CardTitle>
                            <CardAction>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleTheme}
                                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                                </Button>
                            </CardAction>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="registerUsername">Username</Label>
                                    <Input
                                        id="registerUsername"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="registerPassword">Password</Label>
                                    <Input
                                        id="registerPassword"
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="registerConfirmPassword">Confirm Password</Label>
                                    <Input
                                        id="registerConfirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        required
                                    />
                                </div>

                                {error && <p className="text-sm text-destructive">{error}</p>}

                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Signing up…' : 'Sign Up'}
                                </Button>

                                <p className="text-center text-sm text-muted-foreground">
                                    Already have an account?{' '}
                                    <Link to="/login" className="font-medium text-foreground hover:underline">
                                        Log in
                                    </Link>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default SignupPage;