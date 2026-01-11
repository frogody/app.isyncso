import React, { useState } from "react";
import { 
  ArrowLeft, 
  Book, 
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { db } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

export default function KnowledgeBase({ onBack }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => db.entities.HelpArticle.filter({ is_published: true }),
    initialData: []
  });

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={selectedArticle ? () => setSelectedArticle(null) : onBack}
          className="text-gray-400 hover:text-white pl-0 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> {selectedArticle ? "Back to Articles" : "Back to Support"}
        </Button>
      </div>

      {!selectedArticle ? (
        <>
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Book className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles..."
                className="pl-12 h-12 bg-gray-900 border-gray-700 text-lg focus:border-blue-500/50"
              />
            </div>
          </div>

          {filteredArticles.length > 0 ? (
            <div className="grid gap-4">
              {filteredArticles.map((article) => (
                <Card 
                  key={article.id} 
                  className="glass-card border-0 p-6 cursor-pointer hover:border-blue-500/30 transition-all group"
                  onClick={() => setSelectedArticle(article)}
                >
                   <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">{article.title}</h3>
                   <p className="text-gray-400 text-sm line-clamp-2">{article.excerpt || article.content.substring(0, 150) + "..."}</p>
                   <div className="flex gap-2 mt-4">
                      {article.tags?.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400 border border-gray-700">
                          #{tag}
                        </span>
                      ))}
                   </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-card border-0 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <Book className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No articles found</h3>
              <p className="text-gray-500">Try searching for something else</p>
            </Card>
          )}
        </>
      ) : (
        <Card className="glass-card border-0 p-8 md:p-12">
           <div className="prose prose-invert max-w-none">
             <h1 className="text-3xl font-bold text-white mb-6">{selectedArticle.title}</h1>
             <ReactMarkdown className="text-gray-300">
               {selectedArticle.content}
             </ReactMarkdown>
           </div>
        </Card>
      )}
    </div>
  );
}