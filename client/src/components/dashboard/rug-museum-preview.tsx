import { motion } from "framer-motion";
import { Skull, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const featuredRugs = [
  {
    id: 1,
    name: "TerraUSD (UST)",
    symbol: "UST",
    deathDate: "May 2022",
    marketCap: "$60B lost",
    story: "The algorithmic stablecoin that took down an entire ecosystem.",
    memeQuote: "🐸 \"Even Pegg couldn't save this one...\"",
    color: "red",
  },
  {
    id: 2,
    name: "Iron Finance (TITAN)",
    symbol: "TITAN",
    deathDate: "June 2021",
    marketCap: "$2B lost",
    story: "When Mark Cuban learned about depegs the hard way.",
    memeQuote: "🐸 \"Pegg saw this coming...\"",
    color: "orange",
  },
  {
    id: 3,
    name: "Empty Set Dollar (ESD)",
    symbol: "ESD",
    deathDate: "2021",
    marketCap: "$500M lost",
    story: "The \"rebase\" token that rebased itself to zero.",
    memeQuote: "🐸 \"Pegg cried that day...\"",
    color: "purple",
  },
];

export default function RugMuseumPreview() {
  const getColorClasses = (color: string) => {
    const colorMap = {
      red: "border-red-500/20 bg-red-500/20 text-red-500",
      orange: "border-orange-500/20 bg-orange-500/20 text-orange-500",
      purple: "border-purple-500/20 bg-purple-500/20 text-purple-500",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.red;
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Skull className="h-5 w-5 text-neon-pink" />
          Rug Museum - Hall of Shame
        </h3>
        <Link href="/rug-museum">
          <Button 
            variant="ghost" 
            className="text-neon-green hover:text-neon-cyan transition-colors"
          >
            View Full Museum
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredRugs.map((rug, index) => (
          <motion.div
            key={rug.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`bg-black/20 rounded-lg p-4 border ${getColorClasses(rug.color).split(' ')[0]}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorClasses(rug.color)}`}>
                <Skull className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`font-semibold ${getColorClasses(rug.color).split(' ')[2]}`}>
                  {rug.name}
                </h4>
                <p className="text-xs text-gray-400">
                  {rug.deathDate} - {rug.marketCap}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-3">{rug.story}</p>
            <div className="text-xs text-neon-green font-mono">
              {rug.memeQuote}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
