import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sentences = [
  // Safety regulations
  { text: "Drivers must inspect their vehicle before every trip and report any defects to the dispatcher immediately.", category: "safety", difficulty: 1 },
  { text: "When approaching a railroad crossing, come to a complete stop between 15 and 50 feet from the nearest rail.", category: "safety", difficulty: 1 },
  { text: "A commercial motor vehicle must not be driven if the driver has been on duty for more than 11 hours following 10 consecutive hours off duty.", category: "regulations", difficulty: 2 },
  { text: "Hazardous materials must be properly labeled, placarded, and documented before transport can begin.", category: "regulations", difficulty: 2 },
  { text: "All cargo must be properly secured to prevent shifting during transport, especially when making sharp turns or sudden stops.", category: "safety", difficulty: 1 },
  // Road rules
  { text: "At an intersection with a stop sign, you must come to a complete stop before the stop line or crosswalk.", category: "road_rules", difficulty: 1 },
  { text: "When merging onto a highway, you should match the speed of traffic and yield to vehicles already on the road.", category: "road_rules", difficulty: 1 },
  { text: "Drivers should maintain a following distance of at least one second for every ten feet of vehicle length at speeds below 40 miles per hour.", category: "safety", difficulty: 2 },
  { text: "The use of a hand-held mobile telephone while operating a commercial motor vehicle is prohibited under federal regulations.", category: "regulations", difficulty: 2 },
  { text: "Before backing a commercial vehicle, the driver should walk around the vehicle to check for obstructions or people in the path.", category: "safety", difficulty: 1 },
  // General comprehension
  { text: "Proper rest is essential for safe driving; fatigue impairs judgment and reaction time just as much as alcohol impairment.", category: "general", difficulty: 1 },
  { text: "During adverse weather conditions such as heavy rain, snow, or ice, drivers must reduce speed and increase following distance.", category: "general", difficulty: 1 },
  { text: "A pre-trip inspection includes checking lights, brakes, tires, mirrors, and fluid levels to ensure the vehicle is roadworthy.", category: "safety", difficulty: 1 },
  { text: "If you experience a tire blowout, grip the steering wheel firmly, ease off the accelerator, and allow the vehicle to slow gradually before pulling over safely.", category: "safety", difficulty: 2 },
  { text: "Hours of service regulations are designed to prevent drowsy driving by ensuring commercial drivers get adequate rest between shifts.", category: "regulations", difficulty: 2 },
]

async function main() {
  console.log('Seeding test sentences...')
  for (const sentence of sentences) {
    await prisma.testSentence.upsert({
      where: { id: sentence.text.slice(0, 10) },
      update: {},
      create: sentence,
    })
  }
  await prisma.testSentence.createMany({
    data: sentences,
    skipDuplicates: true,
  })
  console.log(`Seeded ${sentences.length} test sentences.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
