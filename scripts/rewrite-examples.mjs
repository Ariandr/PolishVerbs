import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const rootDir = process.cwd()
const outputDir = path.join(rootDir, 'src/data/verbs')
const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.error("Please set the GEMINI_API_KEY environment variable. You can get one from Google AI Studio.")
  process.exit(1)
}

// Using gemini-2.5-flash as it is very fast, cheap and perfectly capable for this task.
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.ARRAY,
      description: "List of new examples for the provided verbs.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          infinitive: { type: SchemaType.STRING, description: "The infinitive form of the verb." },
          example_pl: { type: SchemaType.STRING, description: "A grammatically unique, natural-sounding example sentence in Polish." },
          example_en: { type: SchemaType.STRING, description: "High quality English translation of the example." },
          example_uk: { type: SchemaType.STRING, description: "High quality Ukrainian translation of the example." },
        },
        required: ["infinitive", "example_pl", "example_en", "example_uk"]
      }
    }
  }
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function rewriteChunk(verbsChunk) {
  const prompt = `You are a professional Polish linguist and translator. For the following list of Polish verbs, provide exactly ONE high-quality, natural-sounding, and grammatically unique example sentence for each verb. 
  
Rules:
1. Avoid repetitive patterns, simple or formulaic sentences (e.g., do not just use "I like to [verb]"). 
2. The examples should be sentences that native Polish speakers actually use in daily life, news, or modern literature.
3. Use different subjects, tenses, and contexts for different verbs to make them diverse.
4. Also provide high-quality English and Ukrainian translations for each example sentence that accurately capture the nuance of the Polish sentence.

Verbs to process:
${verbsChunk.map(v => `- ${v.infinitive} (meaning: ${v.translations.en.join(', ')})`).join('\n')}
`
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const json = JSON.parse(text)
      return json
    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e.message)
      await sleep(2000 * attempt)
    }
  }
  return null
}

async function main() {
  const files = (await readdir(outputDir)).filter(file => file.endsWith('.json'))
  // Sort files nicely
  files.sort((a, b) => {
    const numA = parseInt(a.split('-')[0], 10)
    const numB = parseInt(b.split('-')[0], 10)
    return numA - numB
  })
  
  for (const file of files) {
    console.log(`Processing file: ${file}`)
    const filePath = path.join(outputDir, file)
    const records = JSON.parse(await readFile(filePath, 'utf8'))
    
    // We process the verbs in chunks of 20 to avoid overwhelming the model or hitting output token limits.
    const chunkSize = 20
    for (let i = 0; i < records.length; i += chunkSize) {
      console.log(`  Generating examples for verbs ${i + 1} to ${Math.min(i + chunkSize, records.length)}...`)
      const chunk = records.slice(i, i + chunkSize)
      
      const newExamples = await rewriteChunk(chunk)
      if (newExamples) {
        const examplesMap = {}
        for (const ex of newExamples) {
          examplesMap[ex.infinitive] = ex
        }
        
        for (const record of chunk) {
          if (examplesMap[record.infinitive]) {
            const ex = examplesMap[record.infinitive]
            record.examples = [
              {
                pl: ex.example_pl,
                en: ex.example_en,
                uk: ex.example_uk
              }
            ]
          } else {
             console.warn(`    Warning: Model omitted verb ${record.infinitive}`)
          }
        }
      }
      
      // Save file continuously so progress is not lost if the script is stopped
      await writeFile(filePath, JSON.stringify(records, null, 2) + '\n', 'utf8')
      
      // Wait to respect rate limits (Gemini API free tier limit is 15 requests/minute)
      // Waiting 5 seconds ensures we stay well within limits
      await sleep(5000)
    }
    
    console.log(`Successfully completed ${file}\n`)
  }
  console.log("All files processed!")
}

main().catch(console.error)
