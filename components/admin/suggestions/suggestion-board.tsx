"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Plus,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    MoreHorizontal,
    Flag,
    CheckCircle2,
    XCircle,
    Clock,
    Send
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { logError } from "@/lib/utils"

interface Suggestion {
    id: string
    title: string
    description: string
    priority: 'Low' | 'Medium' | 'High' | 'Critical'
    complexity: 'S' | 'M' | 'L' | 'XL'
    status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented'
    created_at: string
    author_id: string
    votes_score?: number
}

interface Comment {
    id: string
    content: string
    created_at: string
    user_id: string
}

export function SuggestionBoard() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState("")
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()

    // Form State
    const [newTitle, setNewTitle] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [newPriority, setNewPriority] = useState("Medium")
    const [newComplexity, setNewComplexity] = useState("M")

    const fetchSuggestions = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('admin_suggestions')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            logError("API admin_suggestions.select", error)
        } else if (data) {
            setSuggestions(data as Suggestion[])
        }
        setLoading(false)
    }

    const fetchComments = async (suggestionId: string) => {
        const { data, error } = await supabase
            .from('suggestion_comments')
            .select('*')
            .eq('suggestion_id', suggestionId)
            .order('created_at', { ascending: true })
        if (error) {
            logError("API suggestion_comments.select", error)
        } else if (data) {
            setComments(data as Comment[])
        }
    }

    useEffect(() => {
        if (!user) return

        fetchSuggestions()
        const channel = supabase
            .channel('admin_suggestions_board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_suggestions' }, fetchSuggestions)
            .subscribe()
        return () => { 
            channel.unsubscribe()
            supabase.removeChannel(channel) 
        }
    }, [supabase, user])

    useEffect(() => {
        if (!user || !selectedSuggestion) return
        fetchComments(selectedSuggestion.id)
        const channel = supabase
            .channel(`comments_${selectedSuggestion.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'suggestion_comments',
                filter: `suggestion_id=eq.${selectedSuggestion.id}`
            }, (payload) => {
                setComments(prev => [...prev, payload.new as Comment])
            })
            .subscribe()
        return () => { 
            channel.unsubscribe()
            supabase.removeChannel(channel) 
        }
    }, [selectedSuggestion, supabase, user])

    const handleCreate = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('admin_suggestions').insert({
            title: newTitle,
            description: newDesc,
            priority: newPriority,
            complexity: newComplexity,
            author_id: user.id
        })

        if (!error) {
            toast.success("Suggestion submitted successfully")
            setIsCreateOpen(false)
            setNewTitle("")
            setNewDesc("")
        } else {
            toast.error("Failed to submit suggestion")
        }
    }

    const handlePostComment = async () => {
        if (!selectedSuggestion || !newComment.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('suggestion_comments').insert({
            suggestion_id: selectedSuggestion.id,
            user_id: user.id,
            content: newComment
        })

        if (!error) {
            setNewComment("")
        } else {
            toast.error("Failed to post comment")
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('admin_suggestions')
            .update({ status: newStatus })
            .eq('id', id)
        if (!error) toast.success(`Status updated to ${newStatus}`)
    }

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'Critical': return 'bg-red-500 hover:bg-red-600'
            case 'High': return 'bg-orange-500 hover:bg-orange-600'
            case 'Medium': return 'bg-yellow-500 hover:bg-yellow-600'
            default: return 'bg-blue-500 hover:bg-blue-600'
        }
    }

    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'Approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'Rejected': return <XCircle className="h-4 w-4 text-red-500" />
            case 'Implemented': return <CheckCircle2 className="h-4 w-4 text-purple-500" />
            case 'Under Review': return <Clock className="h-4 w-4 text-yellow-500" />
            default: return <Clock className="h-4 w-4 text-zinc-500" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin Suggestions</h2>
                    <p className="text-muted-foreground">Collaborate on platform improvements.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Suggestion
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Submit New Feature Request</DialogTitle>
                            <DialogDescription>Describe the feature or improvement you'd like to see.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g., Dark mode for dashboard"
                                    maxLength={100}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Detailed explanation..."
                                    className="h-[100px]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Priority</label>
                                    <Select value={newPriority} onValueChange={setNewPriority}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Complexity</label>
                                    <Select value={newComplexity} onValueChange={setNewComplexity}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="S">Small (S)</SelectItem>
                                            <SelectItem value="M">Medium (M)</SelectItem>
                                            <SelectItem value="L">Large (L)</SelectItem>
                                            <SelectItem value="XL">Extra Large (XL)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Submit Suggestion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((item) => (
                    <Card key={item.id} className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-2">
                                <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                                <Select defaultValue={item.status} onValueChange={(val) => handleUpdateStatus(item.id, val)}>
                                    <SelectTrigger className="h-6 w-[130px] text-xs">
                                        <div className="flex items-center gap-1">
                                            {getStatusIcon(item.status)}
                                            {item.status}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Under Review">Under Review</SelectItem>
                                        <SelectItem value="Approved">Approved</SelectItem>
                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                        <SelectItem value="Implemented">Implemented</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <CardTitle className="text-lg mt-2 cursor-pointer hover:underline" onClick={() => setSelectedSuggestion(item)}>
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                {item.description}
                            </p>
                        </CardContent>
                        <CardFooter className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="font-mono">Size: {item.complexity}</Badge>
                                <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSuggestion(item)}>
                                <MessageSquare className="h-4 w-4 mr-1" /> Discuss
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Comments Dialog */}
            <Dialog open={!!selectedSuggestion} onOpenChange={(open) => !open && setSelectedSuggestion(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedSuggestion?.title}</DialogTitle>
                        <DialogDescription className="whitespace-pre-wrap mt-2 text-primary">
                            {selectedSuggestion?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Discussion</h4>
                        <ScrollArea className="h-[300px] pr-4">
                            {comments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Start the discussion!</p>
                            ) : (
                                <div className="space-y-4">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="bg-muted/50 p-3 rounded-lg text-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold text-xs text-muted-foreground">User {comment.user_id.slice(0, 6)}...</span>
                                                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        <div className="flex gap-2 mt-4">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                            />
                            <Button size="icon" onClick={handlePostComment}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
